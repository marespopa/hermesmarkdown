# EditorSettings

Description: The Settings → Editor section: Layout (Show Sidebar, full width, word wrap, line numbers, invisibles) and Writing (Vim mode, Focus). **Focus** is one choice of three (`FOCUS_OPTIONS` in `settings/focus-options.ts`): **Off**; **Hide interface while typing** (the default: the toolbar, tabs, sidebar and mobile file bar fade while you type and come back when the mouse moves, see `useFadeChromeWhileTyping`); **Hide interface and dim other paragraphs** (the same, plus the paragraph dimming and typewriter scrolling of `codemirror/flow-mode.ts`).

## Local State & Storage
- State: `atom_sidebarOpen`, `atom_fullWidth` (the editor's text column fills the sheet instead of stopping at `--editor-measure`), `atom_wordWrap`, `atom_lineNumbers`, `atom_showInvisibles`, `atom_vimMode`, `atom_focusMode` (`"off" | "hide" | "dim"`).
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
