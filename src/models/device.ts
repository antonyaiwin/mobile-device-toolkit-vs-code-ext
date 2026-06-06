/**
 * Device model and related types for Android device management.
 */

/** The connection state of an Android device reported by ADB */
export type DeviceStatus = 'device' | 'offline' | 'unauthorized' | 'no permissions';

/** The type of Android device */
export type DeviceType = 'emulator' | 'physical';

/**
 * Represents a connected Android device or emulator detected by ADB.
 */
export interface AndroidDevice {
  /** ADB serial identifier (e.g. "emulator-5554" or "R58M...") */
  serial: string;
  /** Human-readable display name (e.g. "Pixel 8 Pro (emulator-5554)") */
  displayName: string;
  /** Whether this is an emulator or physical device */
  type: DeviceType;
  /** ADB connection status */
  status: DeviceStatus;
  /** Optional model name resolved from ADB props */
  model?: string;
}

/**
 * Font scale presets for accessibility control.
 */
export interface FontSizePreset {
  label: string;
  description: string;
  scale: number;
}

/** Built-in font size presets */
export const FONT_SIZE_PRESETS: FontSizePreset[] = [
  { label: '$(text-size) Small', description: 'Font scale: 0.85', scale: 0.85 },
  { label: '$(text-size) Default', description: 'Font scale: 1.0 (default)', scale: 1.0 },
  { label: '$(text-size) Large', description: 'Font scale: 1.15', scale: 1.15 },
  { label: '$(text-size) Largest', description: 'Font scale: 1.30', scale: 1.30 },
];

/**
 * Display density presets.
 */
export interface DisplayDensityPreset {
  label: string;
  description: string;
  /** DPI value, or null to trigger a reset */
  dpi: number | null;
}

/** Built-in display density presets */
export const DISPLAY_DENSITY_PRESETS: DisplayDensityPreset[] = [
  { label: '$(screen-full) Low (280 dpi)', description: '280 dpi', dpi: 280 },
  { label: '$(screen-full) Medium (360 dpi)', description: '360 dpi', dpi: 360 },
  { label: '$(screen-full) High (420 dpi)', description: '420 dpi (default)', dpi: 420 },
  { label: '$(screen-full) XHigh (480 dpi)', description: '480 dpi', dpi: 480 },
  { label: '$(screen-full) XXHigh (560 dpi)', description: '560 dpi', dpi: 560 },
  { label: '$(discard) Reset to Default', description: 'Restore device default density', dpi: null },
];
