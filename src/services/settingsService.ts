import * as vscode from 'vscode';
import { ExtensionSettings } from '../models/settings';

/** Configuration namespace used throughout the extension */
const CONFIG_NAMESPACE = 'emulator-extended-controls';

/**
 * SettingsService – reads and watches VS Code configuration.
 *
 * Responsible for:
 *  - Providing typed access to all extension settings
 *  - Firing a change event when the user edits settings
 */
export class SettingsService {
  /** Emits whenever any extension setting changes */
  private readonly _onDidChangeSettings = new vscode.EventEmitter<ExtensionSettings>();
  readonly onDidChangeSettings = this._onDidChangeSettings.event;

  private disposable: vscode.Disposable;

  constructor() {
    // Watch for configuration changes and re-emit typed settings
    this.disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIG_NAMESPACE)) {
        this._onDidChangeSettings.fire(this.getSettings());
      }
    });
  }

  /**
   * Read all extension settings from VS Code configuration.
   */
  getSettings(): ExtensionSettings {
    const cfg = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    return {
      autoDetectDevices: cfg.get<boolean>('autoDetectDevices', true),
      showDarkModeButton: cfg.get<boolean>('showDarkModeButton', false),
      showScreenshotButton: cfg.get<boolean>('showScreenshotButton', false),
      showRecordButton: cfg.get<boolean>('showRecordButton', false),
      showLayoutBoundsButton: cfg.get<boolean>('showLayoutBoundsButton', false),
      showRotateButton: cfg.get<boolean>('showRotateButton', false),
      outputDirectory: cfg.get<string>('outputDirectory', ''),
    };
  }

  dispose(): void {
    this.disposable.dispose();
    this._onDidChangeSettings.dispose();
  }
}
