# SidebarOutline

Description: The note in front's outline as a tree, Finder / Xcode style (`role="tree"`, `treeitem`s with `aria-level` and `aria-expanded`): its H1–H3 headings (`extractOutline`, skipping frontmatter and fenced code) nested by `buildOutlineTree`, each heading holding the deeper ones under it behind a disclosure chevron that rotates down when open. The chevron's click folds or unfolds without jumping; a click on the heading calls `onJump` with its 1-based line. Keyboard (roving tabindex, one row in the tab order): Up / Down move between visible headings, Right unfolds or steps into the first child, Left folds or steps out to the parent, Enter or Space jumps. Folds reset when the note changes. Renders nothing for a note without headings. Only shown on the workspace.

## Local State & Storage
- State: folded headings and the focused row (local, by line).
- Persistence: None.

## Dependencies
- Core: `atom_fileContent`, `extractOutline`, `buildOutlineTree`, `SidebarSection`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SidebarOutline path={activeTabPath} onJump={(line) => setPendingScrollTarget({ path: activeTabPath, line })} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| path | `string` | | The note |
| onJump | `(line: number) => void` | | A heading was clicked |
