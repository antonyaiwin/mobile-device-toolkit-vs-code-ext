# Changelog

All notable changes to **Mobile Toolkit** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.0.7] - 2026-08-22

### Added

- **Cross-Platform Android SDK & ADB Path Detection (`SdkManager`)**:

  - Added automatic Android SDK detection supporting Windows (`win32`), macOS (`darwin`), and Linux (`linux`).
  - Implemented 3-step sequential fallback strategy: 1) `mobile-toolkit.androidSdkPath` setting, 2) Environment variables (`ANDROID_HOME`, `ANDROID_SDK_ROOT`), 3) Default OS install paths (`%LOCALAPPDATA%\Android\Sdk`, `~/Library/Android/sdk`, `~/Android/Sdk`, etc.).
  - Added flexible path resolution for SDK root directories, `platform-tools` subfolders.

- **Activity Bar ADB Missing State & Settings Shortcut**:

  - Added an interactive **ADB Not Found** notice state inside the Activity Bar sidebar view (`DeviceControlsView`) when `adb` is missing or unconfigured.
  - Added a **Configure SDK Path** button that opens VS Code Settings targeted directly at `mobile-toolkit.androidSdkPath`.

- **CI/CD GitHub Actions Publishing & Release Workflow**:
  - Added `.github/workflows/publish.yml` to automatically build, package, publish to the VS Code Marketplace, and attach `.vsix` binaries to GitHub Releases on tag pushes (`v*.*.*` or `V*.*.*`).

### Fixed

- **Screen Recording Webview Tab Auto-Close**:

  - Fixed an issue where stopping a screen recording from the Activity Bar sidebar left the dedicated Recording Panel webview tab stuck in the "Stopping & Saving…" state. The tab now automatically closes upon completion of saving.

---

## [0.0.6] - 2026-08-21

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
  - Settings namespace under `mobile-toolkit.*`.
  - Explicit ordering of all extension settings in the VS Code Settings UI.
  - Command Palette integration for all commands under the `Mobile Toolkit` category.
