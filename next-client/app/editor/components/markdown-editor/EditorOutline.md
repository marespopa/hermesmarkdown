# EditorMinimap

Description: A code editor's minimap for the note: a 72px strip (`MINIMAP_WIDTH`) down the pane's right edge with the note drawn small on a `<canvas>`, one row per document line (up to 3px, squeezed so a long note fits the strip's height; `minimapLineHeight`), each run of text a faint bar and headings (`# …`) stronger. A slider (`bg-fill`) marks the part of the note on screen. A click or drag on the strip scrolls the pane so that line sits in its middle. Off by default: only mounted when **Minimap** is on (`atom_showMinimap`; `Ctrl/Cmd+Shift+M` in `use-editor-shortcuts.ts`, **Toggle Minimap** in the palette, Settings → Editor → View). Hidden below the `sm` breakpoint. It replaces the sidebar's old Outline section.

## Local State & Storage
- State: the strip's `height` (the pane's, from a `ResizeObserver`), the `slider` box, a `themeTick` that redraws on theme changes, and a `dragging` ref.
- Persistence: none here; `atom_showMinimap` is `localStorage["showMinimap"]`.

## Logic
- The editor scrolls in its pane (`.editor-canvas`, `paneRef`), not in CodeMirror's own scroller, so the strip sits in a zero-height `sticky top-0` box at the top of the pane and reads the pane's scroll. `MarkdownEditor` gives the pane `sm:pr-20` while it's on, so text never runs under it.
- The visible lines come from `view.documentTop` and `lineBlockAtHeight` against the pane's scroll, so wrapped lines and widgets count as they're drawn.
- Bars take the strip's own text colour (`text-fg-muted`, read with `getComputedStyle`), so the map follows the theme; a `MutationObserver` on `<html>` (`class`, `data-theme`, `style`) redraws it when the theme changes.
- The canvas is drawn at `devicePixelRatio`, and redrawn on each text change and resize; the slider updates on the pane's `scroll` and on text changes.

## Dependencies
- Core: `@codemirror/view` (`EditorView`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{showMinimap && <EditorMinimap view={editorView} scrollerRef={paneRef} text={editorValue} />}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| view | `EditorView \| null` | | The pane's editor (line positions) |
| scrollerRef | `RefObject<HTMLDivElement \| null>` | | The pane that scrolls (`.editor-canvas`) |
| text | `string` | | The note's current text, drawn on the map |
