import * as vscode from 'vscode';
import { AdbService } from '../services/adbService';
import { DeviceService } from '../services/deviceService';
import { QuickPickService } from '../ui/quickPickService';

/**
 * Register all device-related commands.
 *
 * Commands registered here:
 *  - emulator-extended-controls.openControls    → main popup
 *  - emulator-extended-controls.selectDevice    → device selector
 *  - emulator-extended-controls.refreshDevices  → manual refresh
 */
export function registerDeviceCommands(
  context: vscode.ExtensionContext,
  adb: AdbService,
  deviceService: DeviceService,
  quickPickService: QuickPickService
): void {
  // ── Main Controls Popup ───────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'emulator-extended-controls.openControls',
      async () => {
        await quickPickService.openControls();
      }
    )
  );

  // ── Device Selector ───────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'emulator-extended-controls.selectDevice',
      async () => {
        await deviceService.refresh();
        const devices = deviceService.devices;
        if (devices.length === 0) {
          vscode.window.showWarningMessage('No Android devices connected.');
          return;
        }
        await quickPickService.showDeviceSelector(devices);
      }
    )
  );

  // ── Manual Device Refresh ─────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'emulator-extended-controls.refreshDevices',
      async () => {
        const available = await adb.isAdbAvailable();
        if (!available) {
          AdbService.notifyAdbNotFound();
          return;
        }
        await deviceService.refresh();
        const count = deviceService.devices.length;
        vscode.window.showInformationMessage(
          count > 0
            ? `Found ${count} device${count > 1 ? 's' : ''} connected.`
            : 'No Android devices connected.'
        );
      }
    )
  );
}
