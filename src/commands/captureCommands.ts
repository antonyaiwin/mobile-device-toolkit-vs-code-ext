import * as vscode from 'vscode';
import { AdbService } from '../services/adbService';
import { DeviceService } from '../services/deviceService';
import { QuickPickService } from '../ui/quickPickService';

/**
 * Register capture-related toolbar commands.
 *
 * Commands registered here:
 *  - emulator-extended-controls.toggleDarkMode     → quick dark-mode toggle
 *  - emulator-extended-controls.takeScreenshot      → instant screenshot
 *  - emulator-extended-controls.startRecording      → start screen recording
 *  - emulator-extended-controls.toggleLayoutBounds  → toggle layout bounds
 *  - emulator-extended-controls.rotateDevice        → rotate device
 */
export function registerCaptureCommands(
  context: vscode.ExtensionContext,
  adb: AdbService,
  deviceService: DeviceService,
  quickPickService: QuickPickService
): void {
  // ── Helper: ensure a device is selected ──────────────────────────────────
  async function withDevice(
    action: (serial: string, displayName: string) => Promise<void>
  ): Promise<void> {
    await deviceService.refresh();
    const device = deviceService.selectedDevice;
    if (!device) {
      vscode.window.showWarningMessage(
        'No Android device selected. Connect a device or start an emulator.'
      );
      return;
    }
    await action(device.serial, device.displayName);
  }

  // ── Toggle Dark Mode ──────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'emulator-extended-controls.toggleDarkMode',
      async () => {
        await withDevice(async (serial, displayName) => {
          try {
            // Read current night mode state
            const currentMode = await adb.runShellCommand(serial, 'cmd uimode night');
            const isNight = currentMode.includes('yes') || currentMode.includes('Night mode: yes');
            const command = isNight ? 'cmd uimode night no' : 'cmd uimode night yes';
            const message = isNight ? 'Dark mode disabled' : 'Dark mode enabled';
            await adb.runShellCommand(serial, command);
            vscode.window.showInformationMessage(`${message} on ${displayName}`);
          } catch (err) {
            vscode.window.showErrorMessage(
              `Dark mode toggle failed on ${displayName}: ${(err as Error).message}`
            );
          }
        });
      }
    )
  );

  // ── Take Screenshot ───────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'emulator-extended-controls.takeScreenshot',
      async () => {
        await withDevice(async (serial, displayName) => {
          await quickPickService.takeScreenshot(serial, displayName);
        });
      }
    )
  );

  // ── Start Screen Recording ────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'emulator-extended-controls.startRecording',
      async () => {
        await withDevice(async (serial, displayName) => {
          await quickPickService.startScreenRecording(serial, displayName);
        });
      }
    )
  );

  // ── Toggle Layout Bounds ──────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'emulator-extended-controls.toggleLayoutBounds',
      async () => {
        await withDevice(async (serial, displayName) => {
          try {
            const current = await adb.runShellCommand(serial, 'getprop debug.layout');
            const isEnabled = current.trim() === 'true';
            const command = isEnabled ? 'setprop debug.layout false' : 'setprop debug.layout true';
            const message = isEnabled ? 'Layout bounds hidden' : 'Layout bounds visible';
            await adb.runShellCommand(serial, command);
            vscode.window.showInformationMessage(`${message} on ${displayName}`);
          } catch (err) {
            vscode.window.showErrorMessage(
              `Layout bounds toggle failed on ${displayName}: ${(err as Error).message}`
            );
          }
        });
      }
    )
  );

  // ── Rotate Device ─────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'emulator-extended-controls.rotateDevice',
      async () => {
        await withDevice(async (serial, displayName) => {
          try {
            await adb.runShellCommand(serial, 'settings put system accelerometer_rotation 0');
            const current = await adb.runShellCommand(serial, 'settings get system user_rotation');
            const next = current.trim() === '1' ? '0' : '1';
            await adb.runShellCommand(serial, `settings put system user_rotation ${next}`);
            vscode.window.showInformationMessage(`Device rotated on ${displayName}`);
          } catch (err) {
            vscode.window.showErrorMessage(
              `Rotate failed on ${displayName}: ${(err as Error).message}`
            );
          }
        });
      }
    )
  );
}
