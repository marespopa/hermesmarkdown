# EditorSettings

Description: The Settings → Editor section: a Writing group (Vim mode, Focus, Word Count, **Typewriter Sound**) and a View group (**Outline**, off by default; also `Ctrl/Cmd+Shift+M` and **Enable/Disable Outline**). Full Width is under Appearance → Typography; word wrap, line numbers and invisibles are command-palette toggles only (`SettingsCommands`). The sidebar is shown and hidden from the toolbar, its own header, Ctrl/Cmd+\ or **Show Sidebar** / **Hide Sidebar**, and keeps its last state. No Distraction Mode has no setting: it is the switch in the editor's top-right row, the palette and `Ctrl/Cmd+Alt+Z`. **Focus** is one choice of three (`FOCUS_OPTIONS` in `settings/focus-options.ts`): **Off** (the default); **Dim other paragraphs** (the paragraph dimming and typewriter scrolling of `codemirror/flow-mode.ts`); **Dim other sentences** (the same, dimmed down to the caret's sentence). Focus never hides the interface: the sidebar and the toolbar change only when you toggle them. A level saved by an older version ("hide") reads as Off.

## Local State & Storage
- State: `atom_vimMode`, `atom_showWordCount` (**Word Count**, off by default; shows `WordCountPill` in the editor), `atom_typewriterLevel` (**Typewriter Sound**, one choice from `TYPEWRITER_OPTIONS` in `settings/typewriter-options.ts`: Off, Quiet, Normal (the default) or Loud; a click per key typed in a note, `TypewriterSound`. It reads and writes `atom_typewriterSound` (the switch) and `atom_typewriterVolume`, so Off keeps the volume last chosen), `atom_focusMode` (`"off" | "hide" | "dim"`), `atom_showOutline` (**Outline**, off by default; shows `EditorOutline` in the editor).
- Persistence: All via `localStorage`; `atom_focusMode` under `focusMode`, where an unknown stored value reads as `"hide"` (`atomWithChoiceStorage`).

## Dependencies
- Core: `SettingControls` (`SettingGroup`, `SettingItem`, `SelectControl`), `Toggle`, `focus-options`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<EditorSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
