# EditorSettings

Description: The Settings → Editor section: a Writing group (Vim mode, Focus, Close Sidebar While Writing, Word Count) and a View group (**Minimap**, off by default; also `Ctrl/Cmd+Shift+M` and **Toggle Minimap**). Full Width is under Appearance → Typography; word wrap, line numbers and invisibles are command-palette toggles only (`SettingsCommands`). The sidebar is shown and hidden from the toolbar, its own header, Ctrl/Cmd+\ or **Toggle Sidebar**, and keeps its last state; **Close Sidebar While Writing** (off by default) also puts it away when you type in a note. **Focus** is one choice of three (`FOCUS_OPTIONS` in `settings/focus-options.ts`): **Off** (the default); **Dim other paragraphs** (the paragraph dimming and typewriter scrolling of `codemirror/flow-mode.ts`); **Dim other sentences** (the same, dimmed down to the caret's sentence). Focus never hides the interface: the sidebar and the toolbar change only when you toggle them. A level saved by an older version ("hide") reads as Off.

## Local State & Storage
- State: `atom_vimMode`, `atom_closeSidebarWhileWriting` (off by default; read by `WorkspaceSidebar`), `atom_showWordCount` (**Word Count**, off by default; shows `WordCountPill` in the editor), `atom_focusMode` (`"off" | "hide" | "dim"`), `atom_showMinimap` (**Minimap**, off by default; shows `EditorMinimap` in the editor).
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
