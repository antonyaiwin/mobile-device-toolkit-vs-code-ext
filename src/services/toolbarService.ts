import * as vscode from 'vscode';
import { DeviceService } from './deviceService';
import { SettingsService } from './settingsService';

/**
 * ToolbarService – manages the dynamic visibility of toolbar commands.
 *
 * VS Code doesn't support runtime-toggling of `debug/toolBar` contributions,
 * so we use `when` clause contexts (vscode.commands.executeCommand('setContext'))
 * to show/hide each toolbar button based on:
 *  - Whether at least one Android device is connected
 *  - The user's optional button settings
 *
 * Context keys set by this service:
 *  - emulator-extended-controls.hasDevices       → main button visibility
 *  - emulator-extended-controls.showDarkMode     → optional button
 *  - emulator-extended-controls.showScreenshot   → optional button
 *  - emulator-extended-controls.showRecord       → optional button
 *  - emulator-extended-controls.showLayoutBounds → optional button
 *  - emulator-extended-controls.showRotate       → optional button
 */
export class ToolbarService {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly settingsService: SettingsService
  ) {}

  /**
   * Initialise context keys and wire up listeners for device/settings changes.
   * Should be called once during extension activation.
   */
  initialize(): void {
    // Set initial state
    this.updateContextKeys();

    // Re-evaluate when device list changes
    this.deviceService.onDevicesChanged(() => this.updateContextKeys());

    // Re-evaluate when settings change
    this.settingsService.onDidChangeSettings(() => this.updateContextKeys());
  }

  /**
   * Force-refresh all context keys immediately.
   * Useful after an explicit device refresh triggered by the user.
   */
  refresh(): void {
    this.updateContextKeys();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private updateContextKeys(): void {
    const hasDevices = this.deviceService.hasDevices;
    const settings = this.settingsService.getSettings();

    // Primary toolbar icon – visible whenever at least one device is online
    void vscode.commands.executeCommand(
      'setContext',
      'emulator-extended-controls.hasDevices',
      hasDevices
    );

    // Optional quick-action buttons – visible only when device present AND user enabled them
    void vscode.commands.executeCommand(
      'setContext',
      'emulator-extended-controls.showDarkMode',
      hasDevices && settings.showDarkModeButton
    );

    void vscode.commands.executeCommand(
      'setContext',
      'emulator-extended-controls.showScreenshot',
      hasDevices && settings.showScreenshotButton
    );

    void vscode.commands.executeCommand(
      'setContext',
      'emulator-extended-controls.showRecord',
      hasDevices && settings.showRecordButton
    );

    void vscode.commands.executeCommand(
      'setContext',
      'emulator-extended-controls.showLayoutBounds',
      hasDevices && settings.showLayoutBoundsButton
    );

    void vscode.commands.executeCommand(
      'setContext',
      'emulator-extended-controls.showRotate',
      hasDevices && settings.showRotateButton
    );
  }
}
