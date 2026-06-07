import * as vscode from 'vscode';
import { AdbService } from '../../services/adbService';
import { DeviceService } from '../../services/deviceService';
import { RecordingPanel } from './recordingPanel';
import {
  DeviceSettingsState,
  FONT_SCALE_OPTIONS,
  DISPLAY_DENSITY_OPTIONS,
  TALKBACK_SERVICE,
  SELECT_TO_SPEAK_SERVICE,
} from '../../models/device';

/** Messages the webview sends to the extension. */
type WebviewMessage =
  | { type: 'ready' }
  | { type: 'setDarkTheme'; value: boolean }
  | { type: 'setNavigationMode'; value: string }
  | { type: 'setTalkBack'; value: boolean }
  | { type: 'setSelectToSpeak'; value: boolean }
  | { type: 'setFontSize'; value: string }
  | { type: 'setDisplaySize'; value: string }
  | { type: 'setLayoutBounds'; value: boolean }
  | { type: 'toggleRecording' };

/**
 * DeviceSettingsPanel – VS Code Webview panel providing the Device Settings UI.
 *
 * Renders checkboxes, dropdowns and a record button matching the Android Studio
 * "Device Settings" panel style.
 */
export class DeviceSettingsPanel {
  private static _instance: DeviceSettingsPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  // ── Static factory ─────────────────────────────────────────────────────────

  static createOrShow(
    context: vscode.ExtensionContext,
    adb: AdbService,
    deviceService: DeviceService
  ): DeviceSettingsPanel {
    if (DeviceSettingsPanel._instance) {
      DeviceSettingsPanel._instance._panel.reveal(vscode.ViewColumn.Beside);
      DeviceSettingsPanel._instance._refreshState(adb, deviceService);
      return DeviceSettingsPanel._instance;
    }

    const panel = vscode.window.createWebviewPanel(
      'emulatorDeviceSettings',
      'Device Settings',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true }
    );

    DeviceSettingsPanel._instance = new DeviceSettingsPanel(panel, context, adb, deviceService);
    return DeviceSettingsPanel._instance;
  }

  // ── Constructor ────────────────────────────────────────────────────────────

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
    private readonly adb: AdbService,
    private readonly deviceService: DeviceService
  ) {
    this._panel = panel;

    // Render placeholder HTML immediately, then load real state
    this._panel.webview.html = this._buildHtml(null);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (msg: WebviewMessage) => this._handleMessage(msg),
      null,
      this._disposables
    );

    // Keep the record button in sync when RecordingPanel starts/stops recording
    adb.onRecordingChanged((isRecording) => {
      this._postMessage({ type: 'recordingState', isRecording, stopping: false });
    }, null, this._disposables);

    // Clean up when panel is closed
    this._panel.onDidDispose(() => this._dispose(), null, this._disposables);

    // Load initial state
    this._refreshState(adb, deviceService);
  }

  // ── State management ───────────────────────────────────────────────────────

  private async _refreshState(adb: AdbService, deviceService: DeviceService): Promise<void> {
    const device = deviceService.selectedDevice;
    if (!device) { this._postMessage({ type: 'noDevice' }); return; }

    try {
      // Always use adb.isRecording as the source of truth so re-opening
      // the panel after a recording started elsewhere shows the correct state.
      const state = await adb.readDeviceState(device.serial, adb.isRecording);
      this._postMessage({ type: 'setState', state, deviceName: device.displayName });
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to read device state: ${(err as Error).message}`);
    }
  }

  // ── Message handler ────────────────────────────────────────────────────────

  private async _handleMessage(msg: WebviewMessage): Promise<void> {
    const device = this.deviceService.selectedDevice;
    if (!device && msg.type !== 'ready') {
      vscode.window.showWarningMessage('No device selected.');
      return;
    }
    const serial = device!.serial;
    const name = device!.displayName;

    try {
      switch (msg.type) {
        case 'ready':
          await this._refreshState(this.adb, this.deviceService);
          break;

        case 'setDarkTheme':
          await this.adb.setDarkMode(serial, msg.value);
          this._notify(`Dark theme ${msg.value ? 'enabled' : 'disabled'}`, name);
          break;

        case 'setNavigationMode':
          await this.adb.setNavigationMode(serial, msg.value);
          this._notify(`Navigation mode changed`, name);
          break;

        case 'setTalkBack':
          await this.adb.setAccessibilityService(serial, TALKBACK_SERVICE, msg.value);
          this._notify(`TalkBack ${msg.value ? 'enabled' : 'disabled'}`, name);
          break;

        case 'setSelectToSpeak':
          await this.adb.setAccessibilityService(serial, SELECT_TO_SPEAK_SERVICE, msg.value);
          this._notify(`Select to Speak ${msg.value ? 'enabled' : 'disabled'}`, name);
          break;

        case 'setFontSize':
          await this.adb.setFontScale(serial, msg.value);
          this._notify(`Font size set to ${FONT_SCALE_OPTIONS.find(o => o.value === msg.value)?.label ?? msg.value}`, name);
          break;

        case 'setDisplaySize':
          await this.adb.setDisplayDensity(serial, msg.value);
          this._notify(`Display size set to ${DISPLAY_DENSITY_OPTIONS.find(o => o.value === msg.value)?.label ?? msg.value}`, name);
          break;

        case 'setLayoutBounds':
          await this.adb.setLayoutBounds(serial, msg.value);
          this._notify(`Layout bounds ${msg.value ? 'shown' : 'hidden'}`, name);
          break;

        case 'toggleRecording': {
          // Delegate recording entirely to RecordingPanel
          if (!this.adb.isRecording) {
            await RecordingPanel.startRecording(this.context, this.adb, serial, name);
          } else {
            // Recording already active – reveal the dedicated panel
            RecordingPanel.reveal();
          }
          // Refresh so the button state reflects actual recording status
          await this._refreshState(this.adb, this.deviceService);
          break;
        }
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Command failed on ${name}: ${(err as Error).message}`);
      // Re-sync webview state after an error
      await this._refreshState(this.adb, this.deviceService);
    }
  }

  // (Recording is handled by RecordingPanel)

  // ── HTML generation ────────────────────────────────────────────────────────

  private _buildHtml(_state: DeviceSettingsState | null): string {
    const fontOptions = FONT_SCALE_OPTIONS.map(
      (o) => `<option value="${o.value}">${o.label}</option>`
    ).join('');
    const densityOptions = DISPLAY_DENSITY_OPTIONS.map(
      (o) => `<option value="${o.value}">${o.label}</option>`
    ).join('');

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>Device Settings</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #1c1c1e;
    color: #cccccc;
    font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    padding: 14px 18px 18px;
    min-width: 280px;
  }

  .panel-header {
    font-size: 13px;
    font-weight: 600;
    color: #e2e2e2;
    padding-bottom: 10px;
    margin-bottom: 4px;
    border-bottom: 1px solid #3a3a3c;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .device-name {
    font-size: 11px;
    color: #888;
    font-weight: 400;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .loading {
    color: #888;
    font-size: 12px;
    padding: 20px 0;
    text-align: center;
  }

  .settings-list { display: none; }
  .settings-list.visible { display: block; }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 0;
    border-bottom: 1px solid #2c2c2e;
    gap: 12px;
  }
  .row:last-child { border-bottom: none; }

  .row-label {
    color: #c8a454;
    font-size: 12.5px;
    flex-shrink: 0;
  }

  /* ── Checkbox ── */
  input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 15px;
    height: 15px;
    border: 1.5px solid #666;
    border-radius: 2px;
    background: #2a2a2c;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    transition: background 0.1s, border-color 0.1s;
  }
  input[type="checkbox"]:checked {
    background: #0078d4;
    border-color: #0078d4;
  }
  input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 1px;
    width: 5px;
    height: 8px;
    border: 2px solid #fff;
    border-top: none;
    border-left: none;
    transform: rotate(45deg);
  }
  input[type="checkbox"]:disabled {
    opacity: 0.4;
    cursor: default;
  }

  /* ── Select dropdown ── */
  select {
    background: #2d2d30;
    color: #cccccc;
    border: 1px solid #555;
    border-radius: 3px;
    padding: 3px 6px;
    font-size: 12px;
    cursor: pointer;
    outline: none;
    max-width: 150px;
  }
  select:focus { border-color: #0078d4; }
  select:disabled { opacity: 0.4; cursor: default; }

  /* ── Record button ── */
  .section-divider {
    border-top: 1px solid #3a3a3c;
    margin-top: 6px;
    padding-top: 10px;
  }

  .record-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    width: 100%;
    padding: 7px 12px;
    border: none;
    border-radius: 4px;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
    background: #b91c1c;
    color: #fff;
  }
  .record-btn:hover:not(:disabled) { background: #dc2626; }
  .record-btn.recording { background: #991b1b; animation: pulse 1.4s ease-in-out infinite; }
  .record-btn.stopping { background: #555; cursor: wait; }
  .record-btn:disabled { opacity: 0.5; cursor: default; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.65; }
  }

  .dot {
    width: 8px; height: 8px;
    background: currentColor;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .no-device {
    color: #888;
    font-size: 12px;
    padding: 16px 0;
    text-align: center;
    display: none;
  }
</style>
</head>
<body>

<div class="panel-header">
  <span>Device Settings</span>
  <span class="device-name" id="deviceName"></span>
</div>

<div class="loading" id="loading">Loading device state…</div>
<div class="no-device" id="noDevice">No device connected.</div>

<div class="settings-list" id="settingsList">

  <!-- Dark Theme -->
  <div class="row">
    <span class="row-label">Dark Theme:</span>
    <input type="checkbox" id="darkTheme" title="Toggle system dark theme">
  </div>

  <!-- Navigation Mode -->
  <div class="row">
    <span class="row-label">Navigation Mode:</span>
    <select id="navigationMode" title="System navigation style">
      <option value="2">Gestures</option>
      <option value="1">2-Button</option>
      <option value="0">3-Button</option>
    </select>
  </div>

  <!-- TalkBack -->
  <div class="row">
    <span class="row-label">TalkBack:</span>
    <input type="checkbox" id="talkBack" title="Enable/disable TalkBack accessibility service">
  </div>

  <!-- Select to Speak -->
  <div class="row">
    <span class="row-label">Select to Speak:</span>
    <input type="checkbox" id="selectToSpeak" title="Enable/disable Select to Speak accessibility service">
  </div>

  <!-- Font Size -->
  <div class="row">
    <span class="row-label">Font Size:</span>
    <select id="fontSize" title="System font scale">
      ${fontOptions}
    </select>
  </div>

  <!-- Display Size -->
  <div class="row">
    <span class="row-label">Display Size:</span>
    <select id="displaySize" title="Screen pixel density">
      ${densityOptions}
    </select>
  </div>

  <!-- Layout Bounds -->
  <div class="row">
    <span class="row-label">Show Layout Bounds:</span>
    <input type="checkbox" id="layoutBounds" title="Highlight view boundaries for debugging">
  </div>

  <!-- Screen Record -->
  <div class="section-divider">
    <button class="record-btn" id="recordBtn" title="Start/stop screen recording">
      <span class="dot"></span>
      <span id="recordLabel">Record Screen</span>
    </button>
  </div>

</div>

<script>
  const vscode = acquireVsCodeApi();

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const loading    = $('loading');
  const noDevice   = $('noDevice');
  const list       = $('settingsList');
  const deviceName = $('deviceName');
  const recordBtn  = $('recordBtn');
  const recordLabel = $('recordLabel');

  // ── Send message helper ───────────────────────────────────────────────────
  function send(msg) { vscode.postMessage(msg); }

  // ── Wire up controls ──────────────────────────────────────────────────────
  $('darkTheme').addEventListener('change', (e) =>
    send({ type: 'setDarkTheme', value: e.target.checked }));

  $('navigationMode').addEventListener('change', (e) =>
    send({ type: 'setNavigationMode', value: e.target.value }));

  $('talkBack').addEventListener('change', (e) =>
    send({ type: 'setTalkBack', value: e.target.checked }));

  $('selectToSpeak').addEventListener('change', (e) =>
    send({ type: 'setSelectToSpeak', value: e.target.checked }));

  $('fontSize').addEventListener('change', (e) =>
    send({ type: 'setFontSize', value: e.target.value }));

  $('displaySize').addEventListener('change', (e) =>
    send({ type: 'setDisplaySize', value: e.target.value }));

  $('layoutBounds').addEventListener('change', (e) =>
    send({ type: 'setLayoutBounds', value: e.target.checked }));

  recordBtn.addEventListener('click', () => {
    if (recordBtn.classList.contains('stopping')) return;
    send({ type: 'toggleRecording' });
  });

  // ── Handle extension messages ─────────────────────────────────────────────
  window.addEventListener('message', (event) => {
    const msg = event.data;

    if (msg.type === 'setState') {
      const s = msg.state;
      deviceName.textContent = msg.deviceName || '';

      $('darkTheme').checked       = s.darkTheme;
      $('navigationMode').value    = s.navigationMode;
      $('talkBack').checked        = s.talkBack;
      $('selectToSpeak').checked   = s.selectToSpeak;
      $('fontSize').value          = s.fontSize;
      $('displaySize').value       = s.displaySize;
      $('layoutBounds').checked    = s.layoutBounds;
      setRecordingState(s.isRecording, false);

      loading.style.display  = 'none';
      noDevice.style.display = 'none';
      list.classList.add('visible');
      setControlsDisabled(false);
      return;
    }

    if (msg.type === 'noDevice') {
      loading.style.display  = 'none';
      list.classList.remove('visible');
      noDevice.style.display = 'block';
      return;
    }

    if (msg.type === 'recordingState') {
      setRecordingState(msg.isRecording, msg.stopping || false);
    }
  });

  function setRecordingState(recording, stopping) {
    recordBtn.classList.toggle('recording', recording && !stopping);
    recordBtn.classList.toggle('stopping', stopping);
    recordBtn.disabled = stopping;
    recordLabel.textContent = stopping ? 'Stopping…' : recording ? 'Stop Recording' : 'Record Screen';
  }

  function setControlsDisabled(disabled) {
    ['darkTheme','navigationMode','talkBack','selectToSpeak','fontSize','displaySize','layoutBounds']
      .forEach(id => { $(id).disabled = disabled; });
  }

  // ── Notify extension we're ready ──────────────────────────────────────────
  send({ type: 'ready' });
</script>
</body>
</html>`;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _postMessage(msg: Record<string, unknown>): void {
    this._panel.webview.postMessage(msg);
  }

  private _notify(message: string, device: string): void {
    vscode.window.showInformationMessage(`${message} on ${device}`);
  }

  private _dispose(): void {
    DeviceSettingsPanel._instance = undefined;
    this._disposables.forEach((d) => d.dispose());
  }
}
