# SettingsCommands

Description: Renders nothing visible. It registers the command-palette entries for editor settings, once for the whole app (it is mounted globally in `MainPage`; the editor doesn't register its own copies): Enable/Disable Full Width / Word Wrap / Line Numbers / Invisibles / Word Count / Typewriter Sound (which returns to the volume last used) / Outline (`Ctrl/Cmd+Shift+M`) / Vim Mode, `Focus: …` (one per level from `FOCUS_OPTIONS`; the current level is disabled with "Current setting"), `Typewriter Sound: …` (Off, Quiet, Normal, Loud from `TYPEWRITER_OPTIONS`, the current one disabled the same way), `Editor Font: …`, `Text Size: …`, and `Autosave: After Delay` / `Manual Only`. Word wrap, line numbers and invisibles have no Settings rows, so these toggles are their only switches. Theme, Open Settings and Show Keyboard Shortcuts live in `AppCommands`.

## Local State & Storage
- State: `atom_fullWidth`, `atom_wordWrap`, `atom_lineNumbers`, `atom_showInvisibles`, `atom_showWordCount`, `atom_vimMode`, `atom_focusMode`, `atom_toggleSentenceFocus` (**Enable/Disable Sentence Focus**, Ctrl/Cmd+Alt+F), `atom_editorFontFamily`, `atom_renderedFontSize`, `atom_autosaveMode`, `useRegisterCommand`.
- Persistence: The matching `localStorage` keys (`fullWidth`, `wordWrap`, `lineNumbers`, `showInvisibles`, `showWordCount`, `vimMode`, `focusMode`, `editorFontFamily`, `renderedFontSize`, `autosaveMode`).

## Dependencies
- Core: `CommandPaletteContext`, `settings/font-options`, `settings/focus-options`.
- Zero-Cloud: No network or telemetry side effects. Every command only changes local settings.

## Quick Usage
```tsx
import SettingsCommands from "../editor/settings/components/SettingsCommands";

<SettingsCommands />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
