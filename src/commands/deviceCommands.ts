import * as vscode from 'vscode';
import { AdbService } from '../services/adbService';
import { DeviceService } from '../services/deviceService';
import { QuickPickService } from '../ui/quickPickService';

/**
 * Register device-related commands:
 *  - openControls    → open Device Settings webview panel
 *  - selectDevice    → Quick Pick device selector
 *  - refreshDevices  → manual ADB refresh
 */
export function registerDeviceCommands(
  context: vscode.ExtensionContext,
  adb: AdbService,
  deviceService: DeviceService,
  quickPickService: QuickPickService
): void {
  // ── Open Device Controls sidebar ─────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('emulator-extended-controls.openControls', async () => {
      // Focus the Activity Bar container, then focus the specific view.
      // VS Code auto-generates a `<viewId>.focus` command for every registered view.
      await vscode.commands.executeCommand('workbench.view.extension.emulatorDeviceControlsContainer');
      await vscode.commands.executeCommand('emulatorDeviceControls.focus');
    })
  );


  // ── Select Device (command palette / toolbar) ─────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('emulator-extended-controls.selectDevice', async () => {
      await deviceService.refresh();
      const devices = deviceService.devices;
      if (devices.length === 0) {
        vscode.window.showWarningMessage('No Android devices connected.');
        return;
      }
      await quickPickService.showDeviceSelector(devices);
    })
  );

  // ── Refresh Device List ───────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('emulator-extended-controls.refreshDevices', async () => {
      const available = await adb.isAdbAvailable();
      if (!available) { AdbService.notifyAdbNotFound(); return; }
      await deviceService.refresh();
      const count = deviceService.devices.length;
      vscode.window.showInformationMessage(
        count > 0 ? `Found ${count} device${count > 1 ? 's' : ''} connected.` : 'No Android devices connected.'
      );
    })
  );
}
