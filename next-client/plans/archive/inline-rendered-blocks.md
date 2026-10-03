# Inline previews for Mermaid and LaTeX (double-click to edit the source)

## Context

Pipe tables already skip the source view. `codemirror/table-display.tsx` swaps each Lezer `Table` node for a block widget (a `StateField` with `Decoration.replace({ block: true })`), and the Markdown stays the only source of truth. Mermaid gets less: `app/editor/README.md` ("Mermaid flow") says *"Diagrams are not rendered inline."* A pill trigger or Ctrl/Cmd+Shift+Enter opens a separate viewer. LaTeX has no support anywhere, and KaTeX is not in `package.json`.

Nothing technical blocks inline previews. The earlier choice probably came from real costs, and each one can be handled:
- **`mermaid.render()` is async and heavy.** A block widget has to show a placeholder first and swap in the SVG later. That changes its height and can make the view jump. Fix: cache the SVG by source and theme, give the widget an `estimatedHeight`, and call `view.requestMeasure()` after the SVG arrives.
- **Re-render churn.** The widget's `eq()` must compare the source text so edits elsewhere in the note don't rebuild the diagram.
- **Caret and keyboard access.** A replaced range hides the source from the caret. Fix: reuse the table pattern (atomic ranges, caret handoff), so Enter on a focused preview opens the dialog.
- **Broken diagrams while typing.** Show an inline error card that still opens the source dialog.

## Approach

### 1. Shared "rendered block" widget infrastructure
New `codemirror/rendered-block.ts` (<400 lines), modelled on `table-display.tsx`:
- A generic `StateField` that collects matches `{from, to, kind: "mermaid"|"math", source, bodyFrom, bodyTo}` and builds `Decoration.replace({ block: true, widget })`. Mermaid matches come from `FencedCode` nodes whose `CodeInfo` is `mermaid`. Math matches come from `math`/`latex` fences and `$$ … $$` blocks, found by a small line scan that skips code nodes.
- `WidgetType` subclass: `eq` by kind+source, `estimatedHeight` from the cache, a `dblclick` handler (and Enter while focused) that opens the source dialog, `ignoreEvent()` true.
- Add `EditorView.atomicRanges` for these ranges.
- Module-level SVG/HTML cache keyed by `kind + theme + source`.

### 2. Mermaid renderer
Reuse the existing Mermaid viewer's render call and its lazy `import("mermaid")` and theme setup (find the viewer component and move its render helper into a shared util if it isn't one already). Remove the "active-line pill trigger" path, or keep it only as the keyboard shortcut. Ctrl/Cmd+Shift+Enter stays, and the full viewer (zoom, SVG download) stays reachable from the source dialog.

### 3. LaTeX renderer
- Add `katex` as a dependency and load it lazily (`import("katex")`) along with its CSS.
- Block math only in this change: `$$…$$` and ```` ```math ````. Inline `$x$` needs inline replace decorations and is ambiguous with currency (`$2,000` appears in the README), so it's left for a follow-up.
- `katex.renderToString(src, { displayMode: true, throwOnError: false })`.

### 4. Source dialog
New `app/editor/components/RenderedBlockSourceDialog.tsx` (+ `.md` doc), built on the project's `DialogModal` with `Button`s (per AGENT_RULES):
- A monospace source editor (a small CodeMirror instance, or `BareInput`/textarea if simpler), with a live preview next to it using the same renderer and cache.
- **Save** writes the body back with one transaction on `bodyFrom..bodyTo` (one undo step, as in principle 3 of ARCHITECTURE.md). **Cancel** or Esc discards.
- Mermaid only: an "Open viewer" button for zoom/download.
- Dialog state lives in a jotai atom in `app/atoms/`. The widget sets it through a `StateEffect` or callback facet, the same way table menus reach React.

### 5. Wiring and docs
- Register the extension wherever `table-display` is added to the editor extensions.
- Update `app/editor/README.md` (replace "Mermaid flow" with a "Rendered blocks" section), `next-client/README.md` Features, and `ARCHITECTURE.md` runtime components.
- Save a copy of this plan in `next-client/.plans/`.

### Files
- New: `codemirror/rendered-block.ts`, `utils/render-mermaid.ts`, `utils/render-math.ts`, `components/RenderedBlockSourceDialog.tsx` + `.md`, a dialog atom, and tests.
- Modified: the editor extensions list, the existing Mermaid trigger/viewer, `globals.scss` (preview card styles using `bg-surface-raised` / `border-edge` tokens), `package.json` (`katex`), and the docs listed above.

## Verification (only when the user asks to run it)
- Vitest: match collection (fences, `$$` blocks, math inside code blocks ignored), widget `eq`, dialog save producing a single transaction and undo restoring the original, and an error card for invalid input. Mock `mermaid`/`katex`.
- `corepack yarn check` for types and lint.
- Manual check by the user (no Playwright): diagrams and formulas render in light and dark themes, double-click opens the source, saving updates the preview, undo works, arrow keys move past the blocks, and scrolling doesn't jump in long notes.
