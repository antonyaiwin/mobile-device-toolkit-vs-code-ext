import * as vscode from 'vscode';
import { AdbService } from './services/adbService';
import { DeviceService } from './services/deviceService';
import { SettingsService } from './services/settingsService';
import { ToolbarService } from './services/toolbarService';
import { QuickPickService } from './ui/quickPickService';
import { registerDeviceCommands } from './commands/deviceCommands';
import { registerCaptureCommands } from './commands/captureCommands';
import { registerToolbarCommands } from './commands/toolbarCommands';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[emulator-extended-controls] Activating…');

  const adbService      = new AdbService();
  const settingsService = new SettingsService();
  const deviceService   = new DeviceService(adbService);
  const toolbarService  = new ToolbarService(deviceService, settingsService);
  const quickPickService = new QuickPickService(deviceService);

  context.subscriptions.push(deviceService, settingsService);

  toolbarService.initialize();

  registerDeviceCommands(context, adbService, deviceService, quickPickService);
  registerCaptureCommands(context, adbService, deviceService, quickPickService);
  registerToolbarCommands(context, adbService, deviceService, quickPickService);

  const settings = settingsService.getSettings();
  deviceService.startPolling(settings.autoDetectDevices);

  settingsService.onDidChangeSettings((s) => {
    deviceService.stopPolling();
    deviceService.startPolling(s.autoDetectDevices);
    toolbarService.refresh();
  });

  const adbAvailable = await adbService.isAdbAvailable();
  if (!adbAvailable) {
    vscode.window.showWarningMessage(
      'Emulator Extended Controls: ADB not found in PATH.',
      'Learn More'
    ).then((s) => {
      if (s === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://developer.android.com/tools/releases/platform-tools'));
      }
    });
  }

  console.log('[emulator-extended-controls] Activated.');
}

export function deactivate(): void {
  console.log('[emulator-extended-controls] Deactivated.');
}
