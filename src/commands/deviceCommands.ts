import * as vscode from 'vscode';
import { AdbService } from '../services/adbService';
import { DeviceService } from '../services/deviceService';
import { DeviceSettingsPanel } from '../ui/webview/deviceSettingsPanel';
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
  // ── Open Device Settings webview ──────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('emulator-extended-controls.openControls', async () => {
      const available = await adb.isAdbAvailable();
      if (!available) { AdbService.notifyAdbNotFound(); return; }

      await deviceService.refresh();
      const devices = deviceService.devices;

      if (devices.length === 0) {
        vscode.window.showWarningMessage('No Android devices connected. Connect a device or start an emulator.');
        return;
      }

      // If multiple devices, let the user pick one first
      if (devices.length > 1) {
        const picked = await quickPickService.showDeviceSelector(devices);
        if (!picked) { return; }
      }

      DeviceSettingsPanel.createOrShow(context, adb, deviceService);
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
