# Edit / Preview mode with an Apple-style switch

## Context
Notes always open in the CodeMirror source editor. The user wants a read-only **Preview** mode with a clean, Apple-style segmented switch (Edit | Preview) for moving between the two modes.

We tried this before. A Milkdown-based "editable preview" (`dc698de9`) was removed as unstable in `aa9022f9`, because it ran a second editor engine with its own document model. This plan avoids that problem. **Preview is the same `EditorView`, reconfigured through a compartment.** There's no second renderer or new dependency, and the Markdown stays the only source of truth. Tables, Mermaid/KaTeX blocks, link and tag pills, and frontmatter folding already render inline, so preview reuses all of them.

Decisions confirmed with the user:
- Preview is a read-only reading view.
- The mode is app-wide: one setting for every pane and tab (changed from per-file on 2026-10-01).
- The switch sits in the pane header and the mobile bar, with a shortcut and a command palette entry.

## Approach

### 1. State: app-wide mode
- `atom_viewMode` (`"edit" | "preview"`, default edit) in `app/atoms/ui-atoms.ts`, an `atomWithStorage("viewMode")` like `atom_flowMode`. Every pane reads the same value.

### 2. CodeMirror: a preview compartment
- `app/editor/codemirror/extensions.ts`: replace the static `EditorView.editable.of(!opts.readOnly)` with `previewCompartment.of(previewExtension(mode))`.
- New `codemirror/preview-mode.ts` (<400 lines) exports:
  - `previewModeFacet` (boolean), so other plugins can ask "am I in preview?"
  - `previewExtension(on)`, which returns `[]` in edit. In preview it returns `[previewModeFacet.of(true), EditorState.readOnly.of(true), EditorView.editable.of(false), EditorView.contentAttributes.of({ "data-mode": "preview" }), previewDisplayPlugin]`.
  - `previewDisplayPlugin`, a `ViewPlugin` that walks the Lezer tree over `visibleRanges`, like `link-display.ts` / `tag-pills.ts`, and emits replace and line decorations:
    - `HeaderMark` plus the space after it: hidden.
    - `EmphasisMark`, `StrikethroughMark`, inline `CodeMark`, and `==` highlight markers: hidden. `highlight.ts` already styles the text between them.
    - `QuoteMark`: hidden. The line gets a `cm-previewQuote` class (left rule plus indent).
    - Unordered `ListMark`: a bullet widget (`•` / `◦` by depth). Ordered list markers stay.
    - `TaskMarker`: a checkbox widget whose click calls the existing `toggleCheckboxOnLine` from `commands.ts`. Programmatic dispatch still works under `readOnly`, so checklists stay usable.
    - Fence lines (```` ``` ```` + `CodeInfo`): collapsed to zero height. Code lines get a `cm-previewCode` card class.
    - `HorizontalRule`: an `<hr>` widget.
  - The plugin only decorates in preview, so edit mode is untouched. It has no cursor-aware reveal because preview is read-only.
- `hooks/use-codemirror-editor.ts`: add `previewMode` to the options and create a fourth compartment alongside wordWrap/lineNumbers/vim/flow. A `useEffect` reconfigures it, using the same pattern as the existing four.
  - **Scroll anchor**: before reconfiguring, read `view.lineBlockAtHeight(view.scrollDOM.scrollTop).from`. Afterwards, dispatch `EditorView.scrollIntoView(pos, { y: "start" })` so the reader stays on the same paragraph.
  - Entering preview also turns off vim and flow mode through their compartments, and restores them on exit.

### 3. Respect the facet in existing interactive layers
Each of these checks `view.state.facet(previewModeFacet)`:
- `table-display.tsx` / `table-cell-dom.ts`: cells get `contenteditable="false"`, and right-click menus and rulers are suppressed.
- `rendered-block.ts`: no double-click or Edit button. The Mermaid viewer could still open on click, which is a nice touch.
- `link-display.ts` and wikilink clicks: a plain click follows the link in preview.
- Slash menu, wikilink trigger, `AISelectionToolbar`, `MobileSelectionToolbar`, date picker and link pill overlays are hidden when `MarkdownEditor` gets `previewMode`.

### 4. Typography for preview
In `codemirror/theme.ts`, scope rules under `.cm-content[data-mode=preview]`:
- Use the reading font (`atom_renderedFontFamily`, which already exists and is labeled "primary reading font") through a CSS var set by `useEditorAppearance`.
- Add slightly more line-height, a hidden caret, and `user-select: text` so copy still works.
- Use only design tokens from `globals.scss` (`bg-surface-raised`, `border-edge`, `text-fg-muted`), with no `dark:` variants on semantic colors (DESIGN.md).
- Mode change transition: briefly add a `cm-modeSwitching` class to `.cm-scroller` (opacity 1→0.6→1 over 180 ms) so the reflow reads as a soft crossfade. The class is skipped under `prefers-reduced-motion`.

### 5. The Apple-style switch
New `app/components/ModeSwitch/` containing `ModeSwitch.component.tsx`, `index.ts` and `ModeSwitch.md`, plus a README index entry:
- Generic two-option segmented control: `options: [{value, label, Icon}]`, `value`, `onChange`, `size: "sm" | "md"`, `iconOnly?`.
- Look:
  - Pill track `rounded-full bg-surface-raised/70 p-0.5 h-7`.
  - An **absolutely positioned thumb** (`rounded-full bg-paper-light dark:bg-white/10 shadow-sm`, plus a hairline `ring-1 ring-black/5`) that slides with `transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]`, the iOS spring-like curve. The thumb is measured from the active segment's offsetLeft/width, so labels can differ in width.
  - Active label `text-ink-light`, inactive `text-ink-muted`. Text is `text-ui-footnote font-medium`.
- Icons: `HiOutlinePencil` (Edit) and `HiOutlineEye` / `HiOutlineBookOpen` (Preview).
- Accessibility:
  - `role="radiogroup"` with `role="radio"` segments, built with `Button variant="unstyled"` per AGENT_RULES.
  - ←/→ keys switch, with a `focus-visible:ring-sage/20` focus ring.
  - Reduced motion uses `motion-reduce:transition-none`.
- The settings `SegmentedControl` in `settings/components/SettingControls.tsx` is left alone; it's a different, multi-option, wrapping control.

### 6. Wiring
- `PaneLeaf.tsx` is at 397 lines and already at the limit, so extract a `PaneModeSwitch` component that reads and writes `atom_viewMode`. Render it in the fixed actions group (before Copy Markdown) when the pane is active and has a file. Labels collapse to `iconOnly` under the existing width thresholds (`tabBarRowWidth < 440`).
- `PaneLeaf` passes `previewMode` into `MarkdownEditor`, which threads it to `useCodeMirrorEditor`.
- `MobileFileIndicator.tsx`: an `iconOnly` `ModeSwitch` before the file label button.
- Shortcut: **Ctrl/Cmd+Alt+P** in `hooks/use-editor-shortcuts.ts`, matched on `e.code === "KeyP"` so it works with Option on macOS. Mod+E (inline code) and Mod+P / Shift+P are taken. Shown in the switch's `Tooltip`.
- Command palette: an "Open in preview" / "Back to editing" entry in `editor-commands/workspace-task-view-commands.ts`, next to the flow mode toggle.
- Leaving preview puts the caret at the first visible line, so typing resumes in place.
- Double-clicking the text in preview switches to edit with the caret at the double-clicked position (capture-phase `dblclick` on `view.dom`; ignored on checkboxes and links).

### 7. Docs and tests
- Docs:
  - `ModeSwitch.md`, `PaneModeSwitch.md`, and updates to `MarkdownEditor.md`, `PaneLeaf.md` and `MobileFileIndicator.md`.
  - `app/editor/README.md`: a new "Preview mode" section next to Flow mode.
  - `ARCHITECTURE.md`: a CodeMirror bullet.
  - `app/documentation/content/editor-writing.tsx`: a user doc paragraph.
  - Save a copy of this plan as `next-client/plans/preview-mode.md`.
- Tests (Vitest, all mocked, wrapped in `<Provider>`):
  - `preview-mode.test.ts`: decorations hide `#`, `**` and `>` markers; task widget click toggles the checkbox; readOnly blocks `insertText`; edit mode produces no decorations.
  - `ModeSwitch.test.tsx`: click and arrow keys call `onChange`; `aria-checked` state is correct.
  - `PaneLeaf.test.tsx`: the switch toggles the active file's mode.

## Critical files
`app/atoms/file-atoms.ts`, `app/editor/codemirror/{extensions.ts, preview-mode.ts (new), theme.ts, table-display.tsx, rendered-block.ts, link-display.ts}`, `app/editor/hooks/{use-codemirror-editor.ts, use-editor-shortcuts.ts}`, `app/editor/components/{MarkdownEditor.tsx, PaneLeaf.tsx, PaneModeSwitch.tsx (new), MobileFileIndicator.tsx}`, `app/components/ModeSwitch/` (new), `editor-commands/workspace-task-view-commands.ts`.

## Verification (run only when the user asks)
- `corepack yarn check` for typecheck and lint, then `corepack yarn vitest run` on the new and updated test files.
- Manual check by the user (no Playwright):
  - The switch slides smoothly in light and dark themes.
  - Preview hides syntax, and tables, diagrams and math look right.
  - Checkboxes toggle, and links and wikilinks open on click.
  - Typing does nothing in preview.
  - Scroll position holds across switches.
  - The mode survives a reload and applies to every pane.
  - The mobile bar switch works.
  - Ctrl/Cmd+Alt+P and the palette entry both toggle.
