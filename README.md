# Emulator Extended Controls

> Android Studio–style emulator controls, right inside VS Code's debug toolbar.

---

## Features

| Feature | Details |
|---|---|
| 🎛️ **Emulator Controls Popup** | One-click access to all controls via a native VS Code Quick Pick menu |
| 📱 **Multi-Device Support** | Automatically detect multiple connected devices; switch instantly |
| 🌙 **Dark Mode Toggle** | Enable / disable system dark mode on the emulator |
| 🔤 **Font Size Control** | Cycle through Small, Default, Large, Largest presets |
| 📐 **Display Density** | Adjust DPI from 280 to 560, or reset to default |
| 🏗️ **Layout Bounds** | Show or hide view boundaries for UI debugging |
| 📸 **Screenshot** | Capture and save a screenshot with one click |
| 🎬 **Screen Recording** | Record up to 3 minutes of device screen |
| ⌨️ **Send Text** | Type text directly into the focused input field |
| 🔄 **Rotate Device** | Toggle device orientation |
| ⚙️ **Optional Toolbar Buttons** | Enable per-command quick-access icons in the debug toolbar |

---

## Requirements

- **VS Code** 1.120.0 or later  
- **Android SDK Platform Tools** (`adb` must be available on your PATH)  
- At least one connected Android device or running emulator  

---

## Getting Started

1. Install the extension.  
2. Start a debug session (or just open a project).  
3. Connect an Android device / start an emulator.  
4. The **$(device-mobile) Emulator Controls** icon appears in the debug toolbar.  
5. Click it to open the controls popup.

---

## Extension Settings

All settings are under the `emulator-extended-controls.*` namespace.

| Setting | Type | Default | Description |
|---|---|---|---|
| `autoDetectDevices` | boolean | `true` | Poll ADB for connected devices automatically |
| `showDarkModeButton` | boolean | `false` | Show a Dark Mode toggle in the toolbar |
| `showScreenshotButton` | boolean | `false` | Show a Screenshot button in the toolbar |
| `showRecordButton` | boolean | `false` | Show a Screen Record button in the toolbar |
| `showLayoutBoundsButton` | boolean | `false` | Show a Layout Bounds toggle in the toolbar |
| `showRotateButton` | boolean | `false` | Show a Rotate Device button in the toolbar |
| `outputDirectory` | string | `""` | Directory for screenshots and recordings (defaults to `emulator-captures/` in workspace root) |

### Example `settings.json`

```json
{
  "emulator-extended-controls.autoDetectDevices": true,
  "emulator-extended-controls.showDarkModeButton": true,
  "emulator-extended-controls.showScreenshotButton": true,
  "emulator-extended-controls.showRecordButton": false,
  "emulator-extended-controls.showLayoutBoundsButton": true,
  "emulator-extended-controls.showRotateButton": false,
  "emulator-extended-controls.outputDirectory": ""
}
```

---

## Available Commands

All commands are available from the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---|---|
| `Emulator: Open Emulator Controls` | Open the main controls popup |
| `Emulator: Select Android Device` | Show the device selector |
| `Emulator: Refresh Device List` | Manually refresh connected devices |
| `Emulator: Toggle Dark Mode` | Toggle dark/light theme on selected device |
| `Emulator: Take Screenshot` | Capture a screenshot |
| `Emulator: Record Screen` | Start a screen recording (max 3 min) |
| `Emulator: Toggle Layout Bounds` | Show/hide layout bounds |
| `Emulator: Rotate Device` | Toggle device orientation |

---

## Toolbar Visibility

The primary toolbar icon appears only when:

- ADB is available on the system PATH  
- At least one Android device is connected and online  

Optional quick-action buttons additionally require the user to enable them in settings.

---

## Multi-Device Workflow

When multiple devices are connected, a **device selector** is shown before the main controls menu. The selected device persists during the session and is used by all toolbar buttons and popup actions.

---

## Architecture

```
src/
├── extension.ts              ← Activation entry point
├── models/
│   ├── device.ts             ← AndroidDevice interface, presets
│   └── settings.ts           ← ExtensionSettings interface
├── services/
│   ├── adbService.ts         ← ADB CLI wrapper
│   ├── deviceService.ts      ← Device detection, selection, polling
│   ├── toolbarService.ts     ← Context key management for toolbar visibility
│   └── settingsService.ts    ← Typed settings access + change events
├── ui/
│   └── quickPickService.ts   ← All Quick Pick menus and actions
└── commands/
    ├── deviceCommands.ts     ← Device-related command registrations
    └── captureCommands.ts    ← Capture & quick-action command registrations
```

---

## Platform Support

| Platform | Supported |
|---|---|
| Windows | ✅ |
| macOS | ✅ |
| Linux | ✅ |

---

## Troubleshooting

**"ADB not found"**  
Ensure `adb` is installed and on your system PATH. Install [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools).

**Toolbar icon not showing**  
Verify a device is connected (`adb devices` in terminal). The icon only appears during an active debug session with a device online.

**Screenshot/Recording saved where?**  
By default in an `emulator-captures/` folder inside your workspace root. Configure `emulator-extended-controls.outputDirectory` to change the location.

---

## License

MIT
