import * as vscode from 'vscode';
import { AdbService } from '../../services/adbService';
import { DeviceService } from '../../services/deviceService';
import { QuickPickService } from '../quickPickService';
import { AndroidDevice, FONT_SCALE_OPTIONS, DISPLAY_DENSITY_OPTIONS } from '../../models/device';

type State = Awaited<ReturnType<AdbService['readDeviceState']>>;

/**
 * DeviceControlsProvider – populates the Activity Bar tree view.
 * Shows device selector + all 7 settings + recording toggle.
 */
export class DeviceControlsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly _onChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onChange.event;

  private _state: State | null = null;

  constructor(
    private readonly adb: AdbService,
    private readonly deviceService: DeviceService,
    private readonly qp: QuickPickService,
    disposables: vscode.Disposable[]
  ) {
    // Auto-refresh when device list or recording state changes
    deviceService.onDevicesChanged(() => this.refresh(), null, disposables);
    deviceService.onSelectedDeviceChanged(() => this.refresh(), null, disposables);
    adb.onRecordingChanged(() => this.refresh(), null, disposables);
  }

  /** Invalidate cached state and re-render the tree. */
  refresh(): void {
    this._state = null;
    this._onChange.fire();
  }

  getTreeItem(el: vscode.TreeItem): vscode.TreeItem { return el; }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const device = this.deviceService.selectedDevice;

    if (!device) {
      return [this._infoItem('No device connected', 'Connect an Android device or start an emulator.', 'warning')];
    }

    // Load (and cache) device state
    if (!this._state) {
      try {
        this._state = await this.adb.readDeviceState(device.serial, this.adb.isRecording);
      } catch {
        return [this._infoItem('Could not read device state', 'Check ADB connection.', 'error')];
      }
    }

    const s = this._state;

    return [
      // ── Device ──────────────────────────────────────────────────
      ...this._section('DEVICE'),
      this._deviceItem(device),

      // ── Settings ────────────────────────────────────────────────
      ...this._section('SETTINGS'),
      this._toggle('Dark Theme',       s.darkTheme,    'color-mode',  'emulator-extended-controls.avd.toggleDarkMode'),
      this._picker('Navigation Mode',  this._navLabel(s.navigationMode), 'arrow-swap', 'emulator-extended-controls.avd.setNavMode'),
      this._toggle('TalkBack',         s.talkBack,     'megaphone',   'emulator-extended-controls.avd.toggleTalkBack'),
      this._toggle('Select to Speak',  s.selectToSpeak,'comment',     'emulator-extended-controls.avd.toggleSelectToSpeak'),
      this._picker('Font Size',        this._fontLabel(s.fontSize),    'whole-word',  'emulator-extended-controls.avd.setFontSize'),
      this._picker('Display Size',     this._densLabel(s.displaySize), 'zoom-in',     'emulator-extended-controls.avd.setDisplaySize'),
      this._toggle('Layout Bounds',    s.layoutBounds, 'layout',      'emulator-extended-controls.avd.toggleLayoutBounds'),

      // ── Recording ────────────────────────────────────────────────
      ...this._section('RECORDING'),
      this._recordItem(s.isRecording),

      // ── Panel ───────────────────────────────────────────────────
      ...this._section(''),
      this._action('Open Device Settings', 'settings-gear', 'emulator-extended-controls.openControls', 'Full settings panel'),
    ];
  }

  // ── Tree item builders ───────────────────────────────────────────────────

  private _section(label: string): vscode.TreeItem[] {
    const sep = new vscode.TreeItem(label);
    sep.contextValue = 'avdSeparator';
    return [sep];
  }

  private _infoItem(label: string, tooltip: string, icon: 'warning' | 'error'): vscode.TreeItem {
    const item = new vscode.TreeItem(label);
    item.iconPath = new vscode.ThemeIcon(icon);
    item.tooltip = tooltip;
    return item;
  }

  private _deviceItem(device: AndroidDevice): vscode.TreeItem {
    const item = new vscode.TreeItem(device.displayName);
    item.iconPath = new vscode.ThemeIcon('device-mobile');
    item.description = device.type === 'emulator' ? 'Emulator' : 'Physical';
    item.tooltip = 'Click to change the active device';
    item.command = { command: 'emulator-extended-controls.avd.selectDevice', title: 'Select Device' };
    item.contextValue = 'avdDevice';
    return item;
  }

  private _toggle(label: string, on: boolean, icon: string, cmd: string): vscode.TreeItem {
    const item = new vscode.TreeItem(label);
    item.description = on ? 'ON' : 'OFF';
    item.iconPath = on
      ? new vscode.ThemeIcon(icon, new vscode.ThemeColor('charts.green'))
      : new vscode.ThemeIcon(icon);
    item.command = { command: cmd, title: label };
    item.tooltip = `${label}: ${on ? 'ON' : 'OFF'} — click to toggle`;
    item.contextValue = 'avdToggle';
    return item;
  }

  private _picker(label: string, value: string, icon: string, cmd: string): vscode.TreeItem {
    const item = new vscode.TreeItem(label);
    item.description = value;
    item.iconPath = new vscode.ThemeIcon(icon);
    item.command = { command: cmd, title: label };
    item.tooltip = `${label}: ${value} — click to change`;
    item.contextValue = 'avdPicker';
    return item;
  }

  private _recordItem(recording: boolean): vscode.TreeItem {
    const item = new vscode.TreeItem(recording ? 'Stop Recording' : 'Record Screen');
    item.iconPath = new vscode.ThemeIcon('record',
      recording ? new vscode.ThemeColor('notificationsErrorIcon.foreground') : undefined);
    item.description = recording ? '● in progress' : '';
    item.command = { command: 'emulator-extended-controls.avd.toggleRecording', title: 'Toggle Recording' };
    item.contextValue = 'avdRecord';
    return item;
  }

  private _action(label: string, icon: string, cmd: string, desc = ''): vscode.TreeItem {
    const item = new vscode.TreeItem(label);
    item.iconPath = new vscode.ThemeIcon(icon);
    item.description = desc;
    item.command = { command: cmd, title: label };
    return item;
  }

  // ── Label helpers ────────────────────────────────────────────────────────

  private _navLabel(v: string): string {
    return ({ '0': '3-Button', '1': '2-Button', '2': 'Gestures' } as Record<string, string>)[v] ?? v;
  }
  private _fontLabel(v: string): string {
    return FONT_SCALE_OPTIONS.find(o => o.value === v)?.label ?? v;
  }
  private _densLabel(v: string): string {
    return DISPLAY_DENSITY_OPTIONS.find(o => o.value === v)?.label ?? v;
  }
}
