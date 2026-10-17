# EditorSettings

Description: The Settings → Editor section: one Writing group (Vim mode, Focus, Close Sidebar While Writing, Word Count). Full Width is under Appearance → Typography; word wrap, line numbers and invisibles are command-palette toggles only (`SettingsCommands`). The sidebar is shown and hidden from the toolbar, its own header, Ctrl/Cmd+\ or **Toggle Sidebar**, and keeps its last state; **Close Sidebar While Writing** (off by default) also puts it away when you type in a note. **Focus** is one choice of four (`FOCUS_OPTIONS` in `settings/focus-options.ts`): **Off**; **Hide interface while typing** (the default: the toolbar, tabs, sidebar and mobile file bar fade while you type and come back when the mouse moves, see `useFadeChromeWhileTyping`); **Hide interface and dim other paragraphs** (the same, plus the paragraph dimming and typewriter scrolling of `codemirror/flow-mode.ts`); **Hide interface and dim other sentences** (the same, dimmed down to the caret's sentence).

## Local State & Storage
- State: `atom_vimMode`, `atom_closeSidebarWhileWriting` (off by default; read by `WorkspaceSidebar`), `atom_showWordCount` (**Word Count**, off by default; shows `WordCountPill` in the editor), `atom_focusMode` (`"off" | "hide" | "dim"`).
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
