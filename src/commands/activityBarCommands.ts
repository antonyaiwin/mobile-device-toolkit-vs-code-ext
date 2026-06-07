import * as vscode from 'vscode';
import { AdbService } from '../services/adbService';
import { DeviceService } from '../services/deviceService';
import { QuickPickService } from '../ui/quickPickService';
import { RecordingPanel } from '../ui/webview/recordingPanel';
import { DeviceControlsProvider } from '../ui/activityBar/deviceControlsProvider';
import {
  TALKBACK_SERVICE, SELECT_TO_SPEAK_SERVICE,
  FONT_SCALE_OPTIONS, DISPLAY_DENSITY_OPTIONS,
} from '../models/device';

/**
 * Register all Activity Bar commands.
 * Each command performs the ADB action then calls provider.refresh()
 * so the tree reflects the new state immediately.
 */
export function registerActivityBarCommands(
  context: vscode.ExtensionContext,
  adb: AdbService,
  deviceService: DeviceService,
  qp: QuickPickService,
  provider: DeviceControlsProvider
): void {

  // ── Shared: device guard ─────────────────────────────────────────────────
  async function withDevice<T>(action: (serial: string, name: string) => Promise<T>): Promise<T | undefined> {
    const device = deviceService.selectedDevice;
    if (!device) { vscode.window.showWarningMessage('No Android device selected.'); return; }
    return action(device.serial, device.displayName);
  }

  const reg = (cmd: string, fn: () => Promise<void>) =>
    context.subscriptions.push(vscode.commands.registerCommand(cmd, fn));

  // ── Select Device ────────────────────────────────────────────────────────
  reg('emulator-extended-controls.avd.selectDevice', async () => {
    await deviceService.refresh();
    if (deviceService.devices.length === 0) {
      vscode.window.showWarningMessage('No Android devices connected.');
    } else {
      await qp.showDeviceSelector(deviceService.devices);
      provider.refresh();
    }
  });

  // ── Refresh Tree ─────────────────────────────────────────────────────────
  reg('emulator-extended-controls.avd.refresh', async () => {
    await deviceService.refresh();
    provider.refresh();
  });

  // ── Toggle Dark Mode ─────────────────────────────────────────────────────
  reg('emulator-extended-controls.avd.toggleDarkMode', async () => {
    await withDevice(async (serial) => {
      const on = await adb.getDarkMode(serial);
      await adb.setDarkMode(serial, !on);
      provider.refresh();
    });
  });

  // ── Navigation Mode ──────────────────────────────────────────────────────
  reg('emulator-extended-controls.avd.setNavMode', async () => {
    await withDevice(async (serial, name) => {
      const current = await adb.getNavigationMode(serial);
      const opts: Array<{ label: string; value: string }> = [
        { label: current === '2' ? '$(check)  Gesture Navigation' : '   Gesture Navigation', value: '2' },
        { label: current === '1' ? '$(check)  2-Button Navigation' : '   2-Button Navigation', value: '1' },
        { label: current === '0' ? '$(check)  3-Button Navigation' : '   3-Button Navigation', value: '0' },
      ];
      const picked = await vscode.window.showQuickPick(opts, { title: `Navigation Mode · ${name}` });
      if (picked) { await adb.setNavigationMode(serial, picked.value); provider.refresh(); }
    });
  });

  // ── Toggle TalkBack ──────────────────────────────────────────────────────
  reg('emulator-extended-controls.avd.toggleTalkBack', async () => {
    await withDevice(async (serial) => {
      const on = await adb.getAccessibilityServiceEnabled(serial, TALKBACK_SERVICE);
      await adb.setAccessibilityService(serial, TALKBACK_SERVICE, !on);
      provider.refresh();
    });
  });

  // ── Toggle Select to Speak ───────────────────────────────────────────────
  reg('emulator-extended-controls.avd.toggleSelectToSpeak', async () => {
    await withDevice(async (serial) => {
      const on = await adb.getAccessibilityServiceEnabled(serial, SELECT_TO_SPEAK_SERVICE);
      await adb.setAccessibilityService(serial, SELECT_TO_SPEAK_SERVICE, !on);
      provider.refresh();
    });
  });

  // ── Font Size ────────────────────────────────────────────────────────────
  reg('emulator-extended-controls.avd.setFontSize', async () => {
    await withDevice(async (serial, name) => {
      const current = await adb.getFontScale(serial);
      const opts = FONT_SCALE_OPTIONS.map(o => ({
        label: o.value === current ? `$(check)  ${o.label}` : `   ${o.label}`,
        value: o.value,
      }));
      const picked = await vscode.window.showQuickPick(opts, { title: `Font Size · ${name}` });
      if (picked) { await adb.setFontScale(serial, picked.value); provider.refresh(); }
    });
  });

  // ── Display Size ─────────────────────────────────────────────────────────
  reg('emulator-extended-controls.avd.setDisplaySize', async () => {
    await withDevice(async (serial, name) => {
      const current = await adb.getDisplayDensity(serial);
      const opts = DISPLAY_DENSITY_OPTIONS.map(o => ({
        label: o.value === current ? `$(check)  ${o.label}` : `   ${o.label}`,
        description: o.value === 'default' ? 'device default' : `${o.value} dpi`,
        value: o.value,
      }));
      const picked = await vscode.window.showQuickPick(opts, { title: `Display Size · ${name}` });
      if (picked) { await adb.setDisplayDensity(serial, picked.value); provider.refresh(); }
    });
  });

  // ── Toggle Layout Bounds ─────────────────────────────────────────────────
  reg('emulator-extended-controls.avd.toggleLayoutBounds', async () => {
    await withDevice(async (serial) => {
      const on = await adb.getLayoutBounds(serial);
      await adb.setLayoutBounds(serial, !on);
      provider.refresh();
    });
  });

  // ── Toggle Recording ─────────────────────────────────────────────────────
  reg('emulator-extended-controls.avd.toggleRecording', async () => {
    if (adb.isRecording) {
      RecordingPanel.reveal();
      return;
    }
    await deviceService.refresh();
    const devices = deviceService.devices;
    if (devices.length === 0) { vscode.window.showWarningMessage('No Android devices connected.'); return; }
    if (devices.length > 1) { const ok = await qp.showDeviceSelector(devices); if (!ok) { return; } }
    const device = deviceService.selectedDevice;
    if (!device) { return; }
    await RecordingPanel.startRecording(context, adb, device.serial, device.displayName);
    provider.refresh();
  });
}
