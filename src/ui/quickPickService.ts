import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AndroidDevice, FONT_SIZE_PRESETS, DISPLAY_DENSITY_PRESETS } from '../models/device';
import { AdbService } from '../services/adbService';
import { DeviceService } from '../services/deviceService';

/**
 * QuickPickService – builds and shows all VS Code Quick Pick UI.
 *
 * Responsible for:
 *  - Main emulator controls popup (openControls)
 *  - Device selector submenu
 *  - Font size / display density submenus
 *  - Delegating actions to the ADB service
 */
export class QuickPickService {
  constructor(
    private readonly adb: AdbService,
    private readonly deviceService: DeviceService,
    private readonly context: vscode.ExtensionContext
  ) {}

  // ---------------------------------------------------------------------------
  // Main Controls Popup
  // ---------------------------------------------------------------------------

  /**
   * Open the main emulator controls Quick Pick menu.
   * If multiple devices are connected, a device selector is shown first.
   */
  async openControls(): Promise<void> {
    const available = await this.adb.isAdbAvailable();
    if (!available) {
      AdbService.notifyAdbNotFound();
      return;
    }

    // Refresh device list before showing UI
    await this.deviceService.refresh();

    const devices = this.deviceService.devices;
    if (devices.length === 0) {
      vscode.window.showWarningMessage(
        'No Android devices connected. Connect a device or start an emulator.'
      );
      return;
    }

    // If multiple devices, offer device selection first
    if (devices.length > 1) {
      const shouldContinue = await this.showDeviceSelector(devices);
      if (!shouldContinue) {
        return;
      }
    }

    await this.showMainMenu();
  }

  // ---------------------------------------------------------------------------
  // Device Selector
  // ---------------------------------------------------------------------------

  /**
   * Show a Quick Pick listing all connected devices.
   * @returns true if the user selected a device, false if they dismissed.
   */
  async showDeviceSelector(devices: AndroidDevice[]): Promise<boolean> {
    const qp = vscode.window.createQuickPick();
    qp.title = 'Select Android Device';
    qp.placeholder = 'Choose a device to control…';
    qp.matchOnDescription = true;

    const currentDevice = this.deviceService.selectedDevice;

    qp.items = devices.map((d) => ({
      label: d.type === 'emulator' ? `$(device-mobile) ${d.displayName}` : `$(device-mobile) ${d.displayName}`,
      description: d.type === 'emulator' ? 'Emulator' : 'Physical Device',
      detail: d.serial === currentDevice?.serial ? '$(check) Currently selected' : undefined,
      serial: d.serial,
    } as vscode.QuickPickItem & { serial: string }));

    return new Promise((resolve) => {
      let accepted = false;
      qp.onDidAccept(() => {
        const selected = qp.selectedItems[0] as vscode.QuickPickItem & { serial: string };
        if (selected?.serial) {
          this.deviceService.selectDevice(selected.serial);
          accepted = true;
        }
        qp.dispose();
        resolve(accepted);
      });

      qp.onDidHide(() => {
        qp.dispose();
        resolve(accepted);
      });

      qp.show();
    });
  }

  // ---------------------------------------------------------------------------
  // Main Menu
  // ---------------------------------------------------------------------------

  private async showMainMenu(): Promise<void> {
    const device = this.deviceService.selectedDevice;
    if (!device) {
      vscode.window.showErrorMessage('No device selected.');
      return;
    }

    interface MenuAction extends vscode.QuickPickItem {
      action: () => Promise<void>;
    }

    const items: MenuAction[] = [
      // ── Section: Device ─────────────────────────────────────────────────────
      {
        label: 'Device',
        kind: vscode.QuickPickItemKind.Separator,
        action: async () => { /* separator – no action */ },
      },
      {
        label: '$(device-mobile) Change Active Device',
        description: `Current: ${device.displayName}`,
        action: async () => {
          await this.showDeviceSelector(this.deviceService.devices);
          await this.showMainMenu();
        },
      },

      // ── Section: Appearance ─────────────────────────────────────────────────
      {
        label: 'Appearance',
        kind: vscode.QuickPickItemKind.Separator,
        action: async () => { /* separator */ },
      },
      {
        label: '$(color-mode) Enable Dark Mode',
        description: 'Switch device to dark theme',
        action: async () => this.runAction(device.serial, 'cmd uimode night yes', 'Dark mode enabled', device.displayName),
      },
      {
        label: '$(color-mode) Disable Dark Mode',
        description: 'Switch device to light theme',
        action: async () => this.runAction(device.serial, 'cmd uimode night no', 'Dark mode disabled', device.displayName),
      },

      // ── Section: Accessibility ──────────────────────────────────────────────
      {
        label: 'Accessibility',
        kind: vscode.QuickPickItemKind.Separator,
        action: async () => { /* separator */ },
      },
      {
        label: '$(text-size) Font Size…',
        description: 'Change system font scale',
        action: async () => this.showFontSizeMenu(device.serial, device.displayName),
      },
      {
        label: '$(screen-full) Display Size…',
        description: 'Change display pixel density',
        action: async () => this.showDisplayDensityMenu(device.serial, device.displayName),
      },

      // ── Section: Developer Options ──────────────────────────────────────────
      {
        label: 'Developer Options',
        kind: vscode.QuickPickItemKind.Separator,
        action: async () => { /* separator */ },
      },
      {
        label: '$(layout) Show Layout Bounds',
        description: 'Highlight view boundaries',
        action: async () => this.runAction(device.serial, 'setprop debug.layout true', 'Layout bounds enabled', device.displayName),
      },
      {
        label: '$(layout) Hide Layout Bounds',
        description: 'Hide view boundaries',
        action: async () => this.runAction(device.serial, 'setprop debug.layout false', 'Layout bounds disabled', device.displayName),
      },
      {
        label: '$(arrow-swap) Rotate Device',
        description: 'Toggle screen rotation lock off',
        action: async () => this.rotateDevice(device.serial, device.displayName),
      },

      // ── Section: Capture ────────────────────────────────────────────────────
      {
        label: 'Screen Capture',
        kind: vscode.QuickPickItemKind.Separator,
        action: async () => { /* separator */ },
      },
      {
        label: '$(device-camera) Take Screenshot',
        description: 'Capture and save screenshot',
        action: async () => this.takeScreenshot(device.serial, device.displayName),
      },
      {
        label: '$(record) Start Screen Recording',
        description: 'Record device screen (max 3 min)',
        action: async () => this.startScreenRecording(device.serial, device.displayName),
      },

      // ── Section: Input ──────────────────────────────────────────────────────
      {
        label: 'Input',
        kind: vscode.QuickPickItemKind.Separator,
        action: async () => { /* separator */ },
      },
      {
        label: '$(keyboard) Send Text…',
        description: 'Type text into the device',
        action: async () => this.sendText(device.serial, device.displayName),
      },
      {
        label: '$(home) Press Home',
        description: 'Go to home screen',
        action: async () => this.runAction(device.serial, 'input keyevent 3', 'Home pressed', device.displayName),
      },
      {
        label: '$(arrow-left) Press Back',
        description: 'Simulate back button',
        action: async () => this.runAction(device.serial, 'input keyevent 4', 'Back pressed', device.displayName),
      },
    ];

    const qp = vscode.window.createQuickPick<MenuAction>();
    qp.title = `Emulator Controls – ${device.displayName}`;
    qp.placeholder = 'Search controls…';
    qp.items = items;
    qp.matchOnDescription = true;

    qp.onDidAccept(async () => {
      const selected = qp.selectedItems[0];
      qp.dispose();
      if (selected?.action) {
        await selected.action();
      }
    });

    qp.onDidHide(() => qp.dispose());
    qp.show();
  }

  // ---------------------------------------------------------------------------
  // Sub-menus
  // ---------------------------------------------------------------------------

  private async showFontSizeMenu(serial: string, deviceName: string): Promise<void> {
    const items = FONT_SIZE_PRESETS.map((p) => ({
      label: p.label,
      description: p.description,
      scale: p.scale,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      title: 'Font Size',
      placeHolder: 'Select a font scale preset…',
    });

    if (selected) {
      await this.runAction(
        serial,
        `settings put system font_scale ${selected.scale}`,
        `Font size set to ${selected.description}`,
        deviceName
      );
    }
  }

  private async showDisplayDensityMenu(serial: string, deviceName: string): Promise<void> {
    const items = DISPLAY_DENSITY_PRESETS.map((p) => ({
      label: p.label,
      description: p.description,
      dpi: p.dpi,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      title: 'Display Size',
      placeHolder: 'Select a display density…',
    });

    if (!selected) {
      return;
    }

    if (selected.dpi === null) {
      await this.runAction(serial, 'wm density reset', 'Display density reset to default', deviceName);
    } else {
      await this.runAction(
        serial,
        `wm density ${selected.dpi}`,
        `Display density set to ${selected.dpi} dpi`,
        deviceName
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Action helpers
  // ---------------------------------------------------------------------------

  /**
   * Run an ADB shell command and show success / error notifications.
   */
  private async runAction(
    serial: string,
    command: string,
    successMessage: string,
    deviceName: string
  ): Promise<void> {
    try {
      await this.adb.runShellCommand(serial, command);
      vscode.window.showInformationMessage(`${successMessage} on ${deviceName}`);
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to run command on ${deviceName}: ${(err as Error).message}`
      );
    }
  }

  /**
   * Capture a screenshot from the device and save it to the workspace/output directory.
   */
  async takeScreenshot(serial: string, deviceName: string): Promise<void> {
    try {
      const outputDir = this.resolveOutputDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot_${timestamp}.png`;
      const outputPath = path.join(outputDir, filename);

      vscode.window.showInformationMessage(`Capturing screenshot from ${deviceName}…`);

      const buffer = await this.adb.runRawCommand(serial, ['exec-out', 'screencap', '-p']);
      fs.writeFileSync(outputPath, buffer);

      const openAction = 'Open File';
      const selection = await vscode.window.showInformationMessage(
        `Screenshot saved: ${filename}`,
        openAction
      );
      if (selection === openAction) {
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(outputPath));
      }
    } catch (err) {
      vscode.window.showErrorMessage(
        `Screenshot failed on ${deviceName}: ${(err as Error).message}`
      );
    }
  }

  /**
   * Start a screen recording on the device.
   * The recording runs for up to 3 minutes, then is pulled to disk.
   */
  async startScreenRecording(serial: string, deviceName: string): Promise<void> {
    const remotePath = '/sdcard/emulator_recording.mp4';

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Recording screen on ${deviceName}…`,
        cancellable: false,
      },
      async () => {
        try {
          // Start recording (blocks until stopped or time limit reached)
          await this.adb.startScreenRecord(serial, remotePath, 180);

          const outputDir = this.resolveOutputDir();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `recording_${timestamp}.mp4`;
          const localPath = path.join(outputDir, filename);

          // Pull the video file from the device
          await this.adb.pullFile(serial, remotePath, localPath);

          // Clean up the remote file
          await this.adb.removeRemoteFile(serial, remotePath);

          vscode.window.showInformationMessage(`Screen recording saved: ${filename}`);
        } catch (err) {
          vscode.window.showErrorMessage(
            `Screen recording failed on ${deviceName}: ${(err as Error).message}`
          );
        }
      }
    );
  }

  /**
   * Show an input box and type text on the selected device.
   */
  private async sendText(serial: string, deviceName: string): Promise<void> {
    const text = await vscode.window.showInputBox({
      title: `Send Text to ${deviceName}`,
      prompt: 'Enter text to type on the device',
      placeHolder: 'Hello World',
    });

    if (text !== undefined && text.length > 0) {
      // Escape special shell characters
      const escaped = text.replace(/(["\s'$`\\])/g, '\\$1');
      await this.runAction(serial, `input text "${escaped}"`, `Text sent to`, deviceName);
    }
  }

  /**
   * Toggle device rotation by disabling the accelerometer-based lock.
   */
  private async rotateDevice(serial: string, deviceName: string): Promise<void> {
    try {
      // Disable auto-rotate first (required for manual rotation)
      await this.adb.runShellCommand(serial, 'settings put system accelerometer_rotation 0');
      // Read current rotation and cycle it
      const current = await this.adb.runShellCommand(serial, 'settings get system user_rotation');
      const next = current.trim() === '1' ? '0' : '1';
      await this.adb.runShellCommand(serial, `settings put system user_rotation ${next}`);
      vscode.window.showInformationMessage(`Device rotated on ${deviceName}`);
    } catch (err) {
      vscode.window.showErrorMessage(
        `Rotate failed on ${deviceName}: ${(err as Error).message}`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Resolve the output directory for screenshots and recordings.
   * Uses the user-configured path, or falls back to the workspace root, or the
   * extension's storage path.
   */
  private resolveOutputDir(): string {
    const config = vscode.workspace.getConfiguration('emulator-extended-controls');
    const userDir = config.get<string>('outputDirectory', '');

    if (userDir) {
      fs.mkdirSync(userDir, { recursive: true });
      return userDir;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const dir = path.join(workspaceFolders[0].uri.fsPath, 'emulator-captures');
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    }

    // Last resort: extension global storage
    const storageUri = this.context.globalStorageUri;
    const dir = path.join(storageUri.fsPath, 'captures');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}
