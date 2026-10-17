# SidebarOutline

Description: The note in front's outline, drawn as the Files tree is (`role="tree"`, `treeitem`s with `aria-level`, `aria-expanded` and `aria-selected`): its H1–H3 headings (`extractOutline`, skipping frontmatter and fenced code) nested by `buildOutlineTree`, in the tree's 28px rows indented 16px per level (`vault-tree/FileRow`'s metrics), each heading that holds deeper ones behind the tree's caret (`IoCaretForward`, rotating down when open). Where a file's icon would be, a faint key shows the heading's level (`H1`, `H2`, `H3`), so the top of the outline reads at a glance; every row is in the primary text colour. The section the caret is in is the current row (`aria-current="location"`, the Files tree's active-row fill `SIDEBAR_ACCENT_FILL`), and the headings it sits in are medium weight (`sectionChain`); when a fold hides it, the folded heading holding it is current instead. The caret's line comes from `atom_activeEditorView`, read once per frame on `selectionchange`. The caret's click folds or unfolds without jumping; a click on the heading calls `onJump` with its 1-based line. Keyboard (roving tabindex, one row in the tab order): Up / Down move between visible headings, Right unfolds or steps into the first child, Left folds or steps out to the parent, Enter or Space jumps. Folds reset when the note changes. Renders nothing for a note without headings. Only shown on the workspace.

## Local State & Storage
- State: folded headings, the focused row and the caret's line (local).
- Persistence: None.

## Dependencies
- Core: `atom_fileContent`, `atom_activeEditorView`, `extractOutline`, `buildOutlineTree`, `SidebarSection`, `react-icons/io5`.
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
