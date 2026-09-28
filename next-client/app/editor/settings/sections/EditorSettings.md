# EditorSettings

Description: The Settings → Editor section: Layout (word wrap, line numbers, collapse frontmatter) and Writing (Vim mode, flow mode).

## Local State & Storage
- State: `atom_wordWrap`, `atom_lineNumbers`, `atom_frontmatterCollapsedByDefault`, `atom_vimMode`, `atom_flowMode`.
- Persistence: All via `atomWithStorage` (`localStorage`).

## Dependencies
- Core: `SettingControls`, `Toggle`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<EditorSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
