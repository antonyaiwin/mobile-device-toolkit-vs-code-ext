/**
 * Typed representation of all configurable extension settings.
 */
export interface ExtensionSettings {
  /** Whether to automatically detect and poll for connected devices */
  autoDetectDevices: boolean;
  /** Show a dedicated Dark Mode toggle button in the debug toolbar */
  showDarkModeButton: boolean;
  /** Show a dedicated Screenshot button in the debug toolbar */
  showScreenshotButton: boolean;
  /** Show a dedicated Screen Record button in the debug toolbar */
  showRecordButton: boolean;
  /** Show a dedicated Layout Bounds toggle button in the debug toolbar */
  showLayoutBoundsButton: boolean;
  /** Show a dedicated Device Rotate button in the debug toolbar */
  showRotateButton: boolean;
  /** Directory to save screenshots and recordings (empty = workspace root) */
  outputDirectory: string;
}
