import * as vscode from 'vscode';
import { AdbService } from './services/adbService';
import { DeviceService } from './services/deviceService';
import { SettingsService } from './services/settingsService';
import { ToolbarService } from './services/toolbarService';
import { QuickPickService } from './ui/quickPickService';
import { registerDeviceCommands } from './commands/deviceCommands';
import { registerCaptureCommands } from './commands/captureCommands';

/**
 * Extension entry point – called by VS Code when the extension is activated.
 *
 * Activation events (defined in package.json):
 *  - onStartupFinished  (lazy activation; the toolbar `when` clause drives visibility)
 *  - onCommand:emulator-extended-controls.openControls
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[emulator-extended-controls] Extension activating…');

  // ── Service instantiation (dependency injection) ──────────────────────────
  const adbService = new AdbService();
  const settingsService = new SettingsService();
  const deviceService = new DeviceService(adbService);
  const toolbarService = new ToolbarService(deviceService, settingsService);
  const quickPickService = new QuickPickService(adbService, deviceService, context);

  // ── Register disposables ──────────────────────────────────────────────────
  context.subscriptions.push(deviceService);
  context.subscriptions.push(settingsService);

  // ── Wire up toolbar visibility ─────────────────────────────────────────────
  toolbarService.initialize();

  // ── Register commands ─────────────────────────────────────────────────────
  registerDeviceCommands(context, adbService, deviceService, quickPickService);
  registerCaptureCommands(context, adbService, deviceService, quickPickService);

  // ── Start device polling ──────────────────────────────────────────────────
  const settings = settingsService.getSettings();
  deviceService.startPolling(settings.autoDetectDevices);

  // Re-start / stop polling when the setting changes
  settingsService.onDidChangeSettings((newSettings) => {
    deviceService.stopPolling();
    deviceService.startPolling(newSettings.autoDetectDevices);
    toolbarService.refresh();
  });

  // Notify user if ADB is not found on first activation
  const adbAvailable = await adbService.isAdbAvailable();
  if (!adbAvailable) {
    vscode.window.showWarningMessage(
      'Emulator Extended Controls: ADB not found in PATH. ' +
      'Please install Android SDK Platform Tools and restart VS Code.',
      'Learn More'
    ).then((selection) => {
      if (selection === 'Learn More') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://developer.android.com/tools/releases/platform-tools')
        );
      }
    });
  }

  console.log('[emulator-extended-controls] Extension activated.');
}

/**
 * Called when the extension is deactivated.
 * Subscriptions are automatically disposed by VS Code via context.subscriptions.
 */
export function deactivate(): void {
  console.log('[emulator-extended-controls] Extension deactivated.');
}
