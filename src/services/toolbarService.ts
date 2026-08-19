import * as vscode from 'vscode';
import { DeviceService } from './deviceService';
import { SettingsService } from './settingsService';

/**
 * ToolbarService – manages VS Code context keys that control toolbar button visibility.
 *
 * Pattern: context key = true  →  button appears in debug/toolBar
 *          context key = false →  button hidden
 */
export class ToolbarService {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly settingsService: SettingsService
  ) {}

  initialize(): void {
    this.updateContextKeys();
    this.deviceService.onDevicesChanged(() => this.updateContextKeys());
    this.settingsService.onDidChangeSettings(() => this.updateContextKeys());
  }

  refresh(): void { this.updateContextKeys(); }

  private updateContextKeys(): void {
    const has = this.deviceService.hasDevices;
    const s   = this.settingsService.getSettings();

    const set = (key: string, val: boolean) =>
      void vscode.commands.executeCommand('setContext', `emulator-extended-controls.${key}`, val);

    // Primary icon – visible when a device is connected AND enabled in settings
    set('hasDevices',        has);
    set('showOpenControls',  has && s.showOpenControlsButton);

    // Optional quick-action buttons – visible only when: device connected AND user enabled them
    set('showDarkMode',      has && s.showDarkModeButton);
    set('showNavMode',       has && s.showNavModeButton);
    set('showTalkBack',      has && s.showTalkBackButton);
    set('showSelectToSpeak', has && s.showSelectToSpeakButton);
    set('showFontSize',      has && s.showFontSizeButton);
    set('showDisplaySize',   has && s.showDisplaySizeButton);
    set('showLayoutBounds',  has && s.showLayoutBoundsButton);
    set('showRecord',        has && s.showRecordButton);
  }
}
