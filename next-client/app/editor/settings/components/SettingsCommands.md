# SettingsCommands

Description: Renders nothing visible. It registers command-palette entries for editor settings (word wrap, line numbers, vim, fonts, autosave, AI provider and model). It is mounted globally in `MainPage`.

## Local State & Storage
- State: `atom_wordWrap`, `atom_lineNumbers`, `atom_vimMode`, `atom_editorFontFamily`, `atom_autosaveMode`, `atom_autosaveDelay`, `atom_aiProvider`, `atom_selectedAiModel`, `useRegisterCommand`.
- Persistence: The matching `localStorage` keys (`wordWrap`, `lineNumbers`, `vimMode`, `editorFontFamily`, `autosaveMode`, `autosaveDelay`, `hermes_ai_provider`, `selectedAiModel`).

## Dependencies
- Core: `CommandPaletteContext`, `settings/font-options`.
- Zero-Cloud: No network or telemetry side effects. Switching the AI provider or model only changes local settings.

## Quick Usage
```tsx
import SettingsCommands from "../editor/settings/components/SettingsCommands";

<SettingsCommands />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
