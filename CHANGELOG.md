# Changelog

All notable changes to **Emulator Extended Controls** will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] – 2026-06-06

### Added

- Primary `debug/toolBar` icon – appears when at least one Android device is connected
- `createQuickPick`-based emulator controls popup with sections:
  - **Device** – change active device
  - **Appearance** – enable / disable dark mode
  - **Accessibility** – font size and display density presets
  - **Developer Options** – layout bounds toggle, rotate device
  - **Screen Capture** – screenshot, screen recording (up to 3 min)
  - **Input** – send text, Home, Back
- Multi-device support with a device selector shown when > 1 device is connected
- Automatic device detection via `adb devices -l` with 4-second polling
- Optional quick-action toolbar buttons (disabled by default, configurable via settings):
  - Dark Mode toggle
  - Screenshot
  - Screen Recording
  - Layout Bounds toggle
  - Rotate Device
- Typed extension settings with `emulator-extended-controls.*` namespace
- Graceful error handling for: ADB not found, no devices, unauthorized devices, command failures
- Screenshots saved as PNG to `emulator-captures/` in workspace root
- Screen recordings saved as MP4 with automatic device cleanup
- Cross-platform support: Windows, macOS, Linux
- Full README documentation

---

## [0.0.1] – Initial scaffold

- VS Code extension scaffold generated