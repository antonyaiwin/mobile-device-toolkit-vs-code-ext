# Changelog

All notable changes to **Mobile Device Toolkit** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.0.1] - 2026-08-21

### Initial Release

#### Added

- **Activity Bar Sidebar Control Panel**:

  - Full control webview interface in the VS Code Activity Bar.
  - Interactive toggles for Dark Theme and Layout Bounds.
  - Dropdown selectors for Navigation Mode (Gesture, 2-Button, 3-Button), Font Scale (Small to Largest), and Display Density (280–560 DPI).
  - Accessibility service toggles for TalkBack screen reader and Select to Speak.
  - Clickable device name header (`📱 Device Name`) to switch active devices instantly.
  - Integrated Screen Recording controls with real-time status and stop & save actions.

- **Debug Toolbar Quick Actions**:

  - Primary **Open Device Controls** toolbar button enabled by default (`showOpenControlsButton`).
  - Configurable quick-action toolbar icons for Dark Mode, Navigation Mode, TalkBack, Select to Speak, Font Size, Display Size, Layout Bounds, and Screen Recording.

- **Screen Recording & Auto-Save Handling**:

  - Screen recording (up to 3 minutes) with automatic resolution scaling and H.264 compatibility.
  - Automatic detection and retrieval of 3-minute recordings when Android's OS time limit is reached.
  - Optional `openRecordingAfterSave` setting to automatically view recorded MP4 files in VS Code's media viewer.
  - Customizable `outputDirectory` setting for saved capture files.

- **Device Detection & Management**:

  - Auto-detection and 4-second polling for connected emulators and physical devices via ADB.
  - Multi-device selector for switching active devices during sessions.

- **Configuration & UX**:
  - Settings namespace under `mobile-device-toolkit.*`.
  - Explicit ordering of all extension settings in the VS Code Settings UI.
  - Command Palette integration for all commands under the `Mobile Device Toolkit` category.
