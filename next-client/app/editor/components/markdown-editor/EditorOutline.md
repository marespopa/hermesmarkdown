# EditorOutline

Description: The note's outline: a small box (`w-52`, at most `max-h-60`, the menus' panel material) fixed in the pane's bottom-right corner, listing the note's H1–H3 headings (`utils/markdown-outline.ts`'s `extractOutline`, which skips the frontmatter and fenced code) as text in the sidebar's 28px rows, indented 12px per level, H1s medium weight. The section being read (the last heading above a quarter of the pane's height) is the current row (`aria-current="location"`, the sidebar's current-row fill), kept in view inside the box, which scrolls on its own for a long outline. A click puts the caret on that heading, scrolls it to a quarter of the pane's height (so it becomes current) and returns focus to the editor. Off by default: only mounted when **Outline** is on (`atom_showOutline`; `Ctrl/Cmd+Shift+M` in `use-editor-shortcuts.ts`, **Toggle Outline** in the palette, Settings → Editor → View). Renders nothing for a note without headings; hidden below the `md` breakpoint. It replaces the sidebar's old Outline section and the minimap that followed it.

## Local State & Storage
- State: `current` (the current heading's line), the list and row refs.
- Persistence: none here; `atom_showOutline` is `localStorage["showOutline"]`.

## Logic
- The editor scrolls in its pane (`.editor-canvas`, `paneRef`), not in CodeMirror's own scroller, so the box sits in a zero-height `sticky bottom-0` box rendered after the sheet (like `WordCountPill`), which holds it in the pane's corner, and reads the pane's scroll. It floats over the page (no room is kept for it); `VimStatusPill` steps left of it (`besideOutline`).
- The current heading comes from `view.documentTop` and `lineBlockAtHeight` against the pane's scroll, so wrapped lines and widgets count as they're drawn; it updates on the pane's `scroll` and on text changes.
- Keeping the current row in view sets the box's own `scrollTop`, never `scrollIntoView`, so the pane never moves.
- Rows keep the editor's focus on mouse down (`preventDefault`), then the click moves the caret and focuses the editor.

## Dependencies
- Core: `@codemirror/view` (`EditorView`), `Button`, `extractOutline`, `sidebarItemClass`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{showOutline && <EditorOutline view={editorView} scrollerRef={paneRef} text={editorValue} />}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| view | `EditorView \| null` | | The pane's editor (line positions, the caret) |
| scrollerRef | `RefObject<HTMLDivElement \| null>` | | The pane that scrolls (`.editor-canvas`) |
| text | `string` | | The note's current text, its headings listed |
