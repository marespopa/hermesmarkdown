# Frontmatter header — engineering PRD

## Context

Source: `plans/001-frontmatter-header/brief.md`. A note's YAML frontmatter should read as a quiet line of chips above the writing (type, tags, status, dates, other keys) and reveal the raw YAML only while the caret or selection is in it, the same way Markdown marks show only on the caret's lines. `status` and date chips can be changed with a click, without editing YAML by hand.

What exists today (all in `app/editor/`):

1. **Raw display.** The block is shown as typed. `codemirror/highlight.ts:159-181` (`computeMarkdownDecorations`) gives every block line `cm-frontmatter-line` (line 1 also gets `cm-frontmatter-start`, the closing fence `cm-frontmatter-end`) and marks keys `cm-frontmatter-key`. It is styled in `codemirror/theme.ts:35-83`: tint `var(--frontmatter-bg-hover)`, text `var(--fg-faint)`, weight 400, a 0.55rem inset border. Hover or focus switches the tint to `--frontmatter-bg-active`.
2. **Block range.** `codemirror/frontmatter-block.ts:21` `frontmatterRangeOf(doc: Text): { closeTo } | null` returns the end of the closing `---`. It is cached per `Text` and only reads lines from the top. The same file has the spacer block widget after the block (`frontmatterSpacer`, :84), the fold summary (`frontmatterSummary`, :43) and `insertOrRevealFrontmatter` (:93), which puts the caret on line 2.
3. **Folding.** `codemirror/heading-fold.ts` folds the block as a level-0 section covering `0..closeTo`. This is an inline replace across lines (CodeMirror `foldEffect`). The placeholder is built in `placeholderDOM` (:313) as "Frontmatter · title · #tags". The chevron is a widget at pos 0, side −1 (`frontmatterFoldable` / `frontmatterFolded`, :248-267). Folded, line 1 also gets `cm-frontmatter-end` so the panel rounds at the bottom. `foldSection` (:122) parks a caret that is inside the block at pos 0.
4. **Caret reveal (pattern to mirror).** `codemirror/syntax-reveal.ts:37` `activeLines(state, hasFocus)` reveals marks only while the editor is focused. Frontmatter is skipped there (:83).
5. **Tag pills inside the block.** `codemirror/tag-pills.ts:233-260` `buildTagPillDecorations` replaces the `tags:` value with `FrontmatterTagListWidget` (:192) and frontmatter tags with pills unless the selection touches them. The styles are `.cm-frontmatter-tag-list*` in `theme.ts:285-301`. This conflicts with "raw YAML exactly as typed" and with the new header covering the same range.
6. **Field parsing.** `app/utils/frontmatter-utils.ts:5` `parseFmFields` is lenient: it never reports malformed or nested YAML and flattens lists to `"a, b"`. `updateFmFields` (:73) rewrites whole lines and re-serializes them (it adds quotes). The brief wants only the value rewritten, so neither is enough on its own.
7. **YAML validity.** `codemirror/markdown-problems.ts:27` `frontmatterProblem` runs js-yaml asynchronously, 1.2 s after typing stops, and shows a notice above the block. It can't drive a synchronous render.
8. **Menus and pickers.** The callout type menu is the pattern to copy. `codemirror/callout-type.ts` sends a DOM `CustomEvent` (`CALLOUT_TYPE_MENU_EVENT`) from `view.dom`. `hooks/use-codemirror-callout-type.ts` listens on `containerRef`, keeps `{pos, x, y, current}` and writes the choice with a single dispatch. `components/CalloutTypeMenu.tsx` renders `TabContextMenu` (`components/TabContextMenu.tsx`: portaled, viewport-clamped, arrow keys, Esc, `checked`, `divider`). The date picker is `components/DatePickerCallout.tsx`, a `DialogModal` with props `isOpen, initialDate, keptTime?, onSelectDate, onClose`. `components/markdown-editor/EditorPills.tsx:64` shows how `keptTime` is derived from an ISO datetime.
9. **Status vocabulary.** `components/constants.ts:5` `WORKFLOW_TAGS = ["draft","review","active","archived"]` (also used by `TagPill`'s `tagKind`).
10. **Opening a note.** `hooks/use-codemirror-editor.ts:129` creates the `EditorState` with no selection, so the caret starts at 0. With frontmatter that position is inside the block, which would reveal raw YAML the moment the editor is focused. **Missing.**
11. **Keyboard helper.** Ctrl/Cmd+Shift+Enter ("Open helper at cursor", `MarkdownEditor.tsx:182` `openActiveHelperRef`) already opens the date picker on an ISO date under the caret (`dateMatch`), including inside the YAML. Nothing opens a status menu. **Missing.**
12. **File sizes.** `MarkdownEditor.tsx` is 376 lines and `theme.ts` is 478 (already over 400; don't grow it). `heading-fold.ts` is 346, `tag-pills.ts` 296, `extensions.ts` 235 and `use-codemirror-editor.ts` 290.

Missing: the header itself, plus items 5 (remove), 10, 11 and the value-only writer.

## Behavior

**When the header shows.** The header replaces the block (`0..closeTo`) with one line of chips. It shows when all of these hold:
- the note has a frontmatter block (`frontmatterRangeOf`) that is not folded at 0;
- the block parses as "simple" YAML (rules below) and yields at least one chip;
- the editor is **not focused**, or **no** selection range touches `[0, closeTo]` (edges included, so a caret at 0 or at `closeTo` counts as inside).

Otherwise the raw YAML shows exactly as it does today: tinted panel, keys muted, no pills. Revealing changes nothing about font weight or line height. The block simply has more lines.

**Reveal triggers.** Arrow keys (ArrowUp from the first body line lands at `0`/`closeTo`), a click on the header row outside a chip, Undo or Redo that restores a selection inside, select-all, `/frontmatter` or **Frontmatter** in the palette (`insertOrRevealFrontmatter`), and the "Go to line" button on a YAML problem notice. Leaving the block, or the editor losing focus, brings the header back.

**Chip order.** Chips appear in this order. Labels are muted text at body size and weight, with no colour, emoji or blur.
1. `type`: its value (`project`).
2. Tags from `tags` (flow `[a, b]`, a `- a` list or a bare `a, b`): `#a`. At most 3, then `+N`.
3. `status`: its value (`in-progress`).
4. Dates. First `due_date` (or `due`) as `Due Nov 15`, then `date` as `Nov 15`, then any other key whose value is an ISO date or datetime (`YYYY-MM-DD`, optionally `THH:MM[:SS][.sss][Z|±HH:MM]`) as `<key> Nov 15` (`created Nov 15`). The year is added when it isn't the current year (`Nov 15, 2027`). Dates are parsed as local calendar dates.
5. Other scalar keys, in YAML order. `title` shows its value only. Any other key shows `<key> <value>`, with the key in `--fg-faint`. A boolean `true` shows just the key (`private`), `false` is omitted. A list of scalars other than tags shows `<key> a, b`. A block scalar (`|`/`>`) shows its first line. Labels longer than 40 characters are cut with `…`, and the full text goes in `title`.

Keys with an empty value (`title:`, `tags: []`) give no chip. Values are unquoted (`'…'` / `"…"`).

**Show raw instead (no header)** when any of these is true:
- a line inside the block isn't blank, a `# comment`, a top-level `key: value` (key `[A-Za-z_][\w-]*`), a `  - scalar` item under a key with an empty value, or a continuation of a `|` / `>` block scalar;
- an indented `sub: x` or a `- key: value` item (nested maps, lists of objects);
- a value that starts with `{`, `&`, `*`, `!` or `|-`/`>-`-style indicators with an inline value, or a flow list containing `[`, `]` or `{`;
- an unbalanced quote, or a bare (unquoted) value containing `: `;
- a duplicate key;
- `{{` anywhere in the block (template notes: the template field pills own it);
- no chips at all (for example the starter `title:` / `tags: []` block).

The js-yaml notice from item 7 still shows above the block when it applies.

**Status chip.** Clicking it, or pressing Enter or Space on it, opens a menu under it. The menu lists `todo`, `in-progress`, `done`, then a divider, then `draft`, `review`, `active`, `archived`. If the current value isn't in the list it appears first, followed by a divider. The current value is checked. Choosing one rewrites only the value characters on that `status:` line, keeping its quotes and any trailing ` # comment`. This is one undo step. Esc or a click outside changes nothing.

**Date chips.** Clicking opens `DatePickerCallout` on that value. Choosing a day writes `YYYY-MM-DD`. A datetime keeps its time part (the `keptTime` convention from `EditorPills.tsx:64`), so `2026-10-24T15:14:54Z` becomes `2026-11-02T15:14:54Z`. Value-only write, one undo step.

**Other chips** (`type`, tags, `+N`, fields) put the caret at the start of that key's value (for tags, on the `tags` line) and focus the editor. That reveals the raw YAML.

**After a menu or picker closes.** Focus returns to the editor. If the selection touches the block, the caret moves to the body start first, so the header stays in view showing the new value.

**Keyboard.**
- Chips are `<button>`s in a `role="toolbar"` row (`aria-label="Frontmatter"`), reachable with Tab and Shift+Tab from the surrounding UI.
- Inside the row, ArrowLeft and ArrowRight move between chips, Enter or Space activates one, and Escape returns focus to the editor without moving the caret.
- In the revealed YAML, Ctrl/Cmd+Shift+Enter (the existing "open helper" binding, not a new shortcut) on a `status:` line opens the status menu. On a date value it already opens the date picker.
- Every chip has an `aria-label` such as `status: in-progress, change status`, `due_date: 2026-11-15, change date` or `type: project, edit`.

**Opening a note.** When the document starts with a frontmatter block, the initial caret goes to the start of the line after the closing `---`. If nothing follows the block, the caret stays at the end of the document (inside the block), so the raw YAML shows while focused. Notes without frontmatter are unchanged.

**Folding.** Folding works exactly as today. The chevron sits by the header row and the folded placeholder replaces the header. Folding with the caret inside the block now parks the caret at the body start instead of 0, so unfolding shows the header rather than raw YAML. If nothing follows the block, it parks at 0 as before.

**Disk wins.** External reloads arrive as `input.external` changes (`use-codemirror-editor.ts:266`). The chips are derived from the document, so they follow whatever is on disk with no prompt.

**Where it applies.** Every vault backend (disk folder via File System Access, browser/OPFS vault, and legacy GitHub vaults, which are already copied into browser vaults). The header is editor-only and does no I/O. It works the same on desktop and mobile: touch taps behave like clicks, and the row wraps on narrow screens. It is not shown in plain-text/code files (`buildPlainTextExtensions`) or in boards (`BoardView`). Private notes stay veiled by `PrivateNoteGate` as before.

## Design

**Why a state-field replace.** The header is an inline `Decoration.replace({ widget })` over `0..closeTo`, provided by a `StateField`. This is the same shape as the frontmatter fold, so line 1 stays a `.cm-line`, the fold chevron widget at 0/side −1 keeps working untouched, and the spacer block widget at `closeTo` stays below. A replace that spans line breaks must come from a state field, not a view plugin. A view plugin can't provide it, and a block widget would remove line 1 and with it the chevron's host line. Focus reaches the field through `EditorView.focusChangeEffect`.

### New: `app/editor/utils/frontmatter-header-chips.ts` (pure, no CodeMirror)

```ts
export type HeaderChipKind = "type" | "tag" | "more-tags" | "status" | "date" | "field";
export interface HeaderChip {
  kind: HeaderChipKind;
  key: string;          // YAML key ("tags" for tag chips)
  label: string;        // shown text ("#work", "Due Nov 15", "in-progress")
  keyLabel?: string;    // the faint key part of a "field" / other-date chip
  value: string;        // raw unquoted value ("2026-11-15")
  line: number;         // 0-based line index in the block text of the key's line
  ariaLabel: string;
}
// null → show raw (malformed / nested / template / no chips).
export function frontmatterHeaderChips(blockText: string, now?: Date): HeaderChip[] | null;
// The value characters on `key`'s line: inside quotes when quoted, without a trailing ` # comment`.
export function frontmatterValueSpan(blockText: string, key: string): { from: number; to: number } | null;
export function shortDate(value: string, now?: Date): string | null; // "Nov 15" / "Nov 15, 2027"; null if not ISO
export const ISO_DATE_VALUE: RegExp;
```
`blockText` is `doc.sliceString(0, closeTo)` (fences included). The offsets returned are relative to it, which equals document offsets because the block starts at 0. `shortDate` uses `toLocaleDateString("en-US", { month: "short", day: "numeric" })`.

### New: `app/editor/codemirror/frontmatter-header.ts` (target under 250 lines)

```ts
export const FRONTMATTER_CHIP_EVENT = "hermes:frontmatter-chip";
export interface FrontmatterChipRequest { kind: "status" | "date"; key: string; value: string; anchor?: DOMRect }
export const setHeaderFocus: StateEffect<boolean>;          // exported for tests
export interface HeaderState { focused: boolean; chips: HeaderChip[] | null; shown: boolean; decorations: DecorationSet }
export const frontmatterHeaderField: StateField<HeaderState>;
export function frontmatterHeaderShown(state: EditorState): boolean;
export function setFrontmatterValue(view: EditorView, key: string, value: string): boolean;
export function requestFrontmatterChipAtCaret(view: EditorView): boolean; // Ctrl/Cmd+Shift+Enter on a status: line
export const frontmatterHeader: Extension; // [field, EditorView.focusChangeEffect.of((_, f) => setHeaderFocus.of(f)), frontmatterHeaderTheme]
```
- **Field update.** Recompute `chips` when `tr.docChanged`. Recompute `shown` when the doc, selection, `setHeaderFocus` or the fold state changes (`foldedRanges(tr.startState) !== foldedRanges(tr.state)`). Rebuild `decorations` only when `shown` or the chips change. The decorations are `Decoration.replace({ widget: new FrontmatterHeaderWidget(chips) }).range(0, closeTo)` plus `Decoration.line({ class: "cm-frontmatter-end cm-frontmatter-header-line" }).range(0)`, provided via `EditorView.decorations.from`.
- **Fold check without an import cycle.** "Folded at 0" means `foldedRanges(state).between(0, 0, (from) => from === 0)` finds a range, checked directly with `@codemirror/language`. Don't import `heading-fold.ts`. Neither file imports the other; both import `frontmatter-block.ts`.
- **`FrontmatterHeaderWidget`.** `eq` compares the chips' `kind/label/keyLabel` lists. `toDOM(view)` builds a `span.cm-frontmatter-header[role=toolbar]` holding `button.cm-fm-chip` elements (`type="button"`, `data-kind`, `aria-label`, `title`). Creating the DOM by hand is the established CodeMirror widget pattern (`heading-fold.ts` chevron, `markdown-problems.ts` jump button); React components can't live inside a widget. `ignoreEvent(e)` returns true only when the target is inside `.cm-fm-chip`, so clicks on the row background reach CodeMirror and place the caret, which reveals the YAML.
- **Chip handlers.**
  - `mousedown` calls `preventDefault`, so the caret doesn't move.
  - `click`, Enter or Space: status and date chips dispatch `FRONTMATTER_CHIP_EVENT` from `view.dom`, with `anchor` set to the chip's `getBoundingClientRect()`. Other chips dispatch `{ selection: { anchor: <value start on key line> }, scrollIntoView: true }` and then call `view.focus()`.
  - `keydown` on the row: ArrowLeft and ArrowRight move focus between chips, Escape calls `view.focus()`.
- **`setFrontmatterValue`.** Uses `frontmatterValueSpan` and runs one `view.dispatch({ changes: { from, to, insert: value }, userEvent: "input.frontmatter", annotations: isolateHistory.of("full") })`, so it is one undo step and never merges with typing. The selection is untouched. It returns false when the key isn't found.
- **`requestFrontmatterChipAtCaret`.** If the main caret is on a `status:` line inside the block, dispatch the event with `kind: "status"` and `anchor = DOMRect` built from `view.coordsAtPos(valueFrom)`, then return true. Otherwise return false.

### New: `app/editor/codemirror/frontmatter-header-theme.ts`

An `EditorView.baseTheme` with no colour literals, only CSS vars:
- `.cm-frontmatter-line.cm-frontmatter-header-line`: same tint as the panel (`var(--frontmatter-bg-hover)`), no change of font size or line height.
- `.cm-frontmatter-header`: `display: inline`, wrapping allowed.
- `.cm-fm-chip`: `font: inherit; font-size: 1em; font-weight: 400; line-height: inherit; color: var(--fg-muted); background: var(--fill); border: 0; border-radius: 0.4em; padding: 0 0.4em; margin: 0 0.15em 0 0; display: inline-block; max-width: 18em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: top; cursor: pointer`.
- `.cm-fm-chip:hover`: `background: var(--fill-hover)`.
- `.cm-fm-chip:focus-visible`: `outline: 2px solid color-mix(in srgb, var(--clay) 45%, transparent)`.
- `.cm-fm-chip-key`: `color: var(--fg-faint)`.

No new tokens, no blur, no colour for status. Tag chips deliberately don't use `TagPill`, whose classes are 0.9em and medium weight; the brief wants body size and weight.

### New: `app/editor/hooks/use-frontmatter-header.ts` (mirrors `use-codemirror-callout-type.ts`)

```ts
interface StatusMenuState { key: string; current: string; x: number; y: number }
interface DatePickerState { key: string; value: string; date: Date; keptTime?: string }
export function useFrontmatterHeader(opts: { viewRef; containerRef }): {
  statusMenu: StatusMenuState | null; datePicker: DatePickerState | null;
  selectStatus(value: string): void; selectDate(date: Date): void; close(): void;
};
```
It listens for `FRONTMATTER_CHIP_EVENT` on `containerRef.current`.
- `selectStatus` calls `setFrontmatterValue(view, key, value)`.
- `selectDate` formats `YYYY-MM-DD` from the local date (as `use-codemirror-templates.ts:88` does), appends `T${keptTime}` when it is set, then calls `setFrontmatterValue`.
- Both, and `close`, then call `returnToEditor(view)`: if the selection touches `[0, closeTo]`, dispatch `selection: bodyStart`, then `view.focus()`.

### New: `app/editor/components/FrontmatterStatusMenu.tsx` (+ `.md`)

`TabContextMenu` with `label="Status"`. Items come from `FRONTMATTER_STATUSES`; an unknown current value is placed first with `divider` on the next item; `checked` marks the current value. Props: `x, y, current, onSelect, onClose`. It is a near-copy of `CalloutTypeMenu.tsx`.

### New: `app/editor/components/markdown-editor/FrontmatterHeaderMenus.tsx` (+ `.md`)

Props `{ viewRef, containerRef }`. It calls `useFrontmatterHeader` and renders `FrontmatterStatusMenu` when `statusMenu` is set, and `<DatePickerCallout isOpen={!!datePicker} initialDate={datePicker.date} keptTime={datePicker.keptTime} … />`. It exists so that `MarkdownEditor.tsx` grows by only a few lines.

### Changed

- `components/constants.ts`: add `export const FRONTMATTER_STATUSES = ["todo", "in-progress", "done", ...WORKFLOW_TAGS];` beside `WORKFLOW_TAGS` (:5), with a comment saying the menu groups them as two lists.
- `codemirror/frontmatter-block.ts`: add `export function bodyStart(doc: Text): number | null`, the start of the line after the closing `---`, or null when the document has no frontmatter or ends at `closeTo`. Update the header comment (:5-7).

## Phase 1: Header display and reveal

- `app/editor/utils/frontmatter-header-chips.ts` (new): `frontmatterHeaderChips`, `frontmatterValueSpan`, `shortDate`, implementing the chip order and raw rules from **Behavior**. Line-based parser; reuse the `FIELD_LINE` shape from `app/utils/frontmatter-utils.ts:3` (copy the regex; don't change that file).
- `app/editor/codemirror/frontmatter-header.ts` (new): field, widget, `setHeaderFocus`, `frontmatterHeaderShown`, `frontmatterHeader` extension. In this phase, status and date chips already dispatch the event (nobody listens yet). Field chips move the caret.
- `app/editor/codemirror/frontmatter-header-theme.ts` (new): styles above.
- `app/editor/codemirror/frontmatter-block.ts`: add `bodyStart`.
- `app/editor/codemirror/frontmatter-block.ts`: also add `withBodyCaret(state)`, which returns `state.update({ selection: { anchor: bodyStart(state.doc) } }).state`, or `state` unchanged when `bodyStart` is null.
- `app/editor/codemirror/extensions.ts:123`: add `frontmatterHeader` right after `frontmatterSpacer`. Re-export the helper with `export { withBodyCaret } from "./frontmatter-block";`. The hook loads `extensions` dynamically, so this avoids a static CodeMirror import in the hook.
- `app/editor/codemirror/editor-performance.bench.ts:69`: add `frontmatterHeader` next to `frontmatterSpacer`.
- `app/editor/hooks/use-codemirror-editor.ts:129`: pass `plainText ? state : extensionsModule.withBodyCaret(state)` to `new CMView({ state })`.
- `app/editor/codemirror/heading-fold.ts:122` `foldSection`: when `section.level === 0` and the caret is inside, park at `bodyStart(view.state.doc) ?? section.from`. Update the comment.
- `app/editor/codemirror/tag-pills.ts`: remove the frontmatter part of `buildTagPillDecorations` (:233-260: `fmEnd`/`fmText`, `frontmatterLists`, the frontmatter `collectTagMatches` call). Keep `.filter((m) => m.from > fmEnd)` with `fmEnd = frontmatterRangeOf(doc)?.closeTo ?? 0`, replacing the local `frontmatterEnd` (:220) with `frontmatterRangeOf` from `frontmatter-block.ts`. Delete `FrontmatterTagListWidget`, `collectFrontmatterTagLists`, `frontmatterTagListForLine` and `FrontmatterTagList`. Keep `collectTagMatches(doc, detectFrontmatter)`, since its tests use it.
- `app/editor/codemirror/theme.ts:285-301`: delete the `.cm-frontmatter-tag-list*` rules (shrinks the file). Add nothing to this file.

## Phase 2: Status menu and date picker

- `app/editor/components/constants.ts`: `FRONTMATTER_STATUSES`.
- `app/editor/codemirror/frontmatter-header.ts`: `setFrontmatterValue`, `requestFrontmatterChipAtCaret`.
- `app/editor/hooks/use-frontmatter-header.ts` (new).
- `app/editor/components/FrontmatterStatusMenu.tsx` + `.md` (new).
- `app/editor/components/markdown-editor/FrontmatterHeaderMenus.tsx` + `.md` (new).
- `app/editor/components/MarkdownEditor.tsx`:
  - import and render `<FrontmatterHeaderMenus viewRef={viewRef} containerRef={containerRef} />` after the `CalloutTypeMenu` block (:347-355);
  - in `openActiveHelperRef.current` (:183), after `openPillLink()`, add `if (viewRef.current && requestFrontmatterChipAtCaret(viewRef.current)) return true;`.
  - That's about 4 added lines, so the file stays under 400. If it would pass 395, move the `CalloutTypeMenu` rendering into `FrontmatterHeaderMenus`' sibling instead. Don't grow past 400.

## Tests

Use Vitest with everything mocked. Use `vi.setSystemTime` for any date label; never move fixture dates into the far future. Don't use people's names in fixtures (use products and tasks: `title: Release plan`, `tags: [work, roadmap]`).

**Phase 1**
- `app/editor/utils/frontmatter-header-chips.test.ts` (new):
  - chip order type → tags → status → dates → fields;
  - tags in flow, `- item` and bare forms; `+N` after 3;
  - `Due Nov 15` / `Nov 15` / `created Nov 15`, and the year shown only outside the current year (`vi.setSystemTime(new Date(2026, 9, 25))`);
  - datetime recognised; quoted values unquoted; `title` value-only; `private: true` → `private`, `false` omitted; empty values omitted; long label cut with `…`; comments ignored;
  - returns `null` for: a nested map, a list of objects, a flow map, an unbalanced quote, a duplicate key, a bare value containing `: `, `{{`, and a block with no chips;
  - `frontmatterValueSpan`: bare, double- and single-quoted, trailing comment, missing key → null.
- `app/editor/codemirror/frontmatter-header.test.ts` (new; `EditorView` with `[markdown(), frontmatterSpacer, headingFolding, frontmatterHeader]`; drive focus with `setHeaderFocus.of(true/false)`):
  - unfocused → `.cm-frontmatter-header` is shown and the YAML text isn't in `contentDOM.textContent`;
  - focused, caret in body → header; focused, caret on line 2 → raw lines and no header; caret at 0 and at `closeTo` → raw;
  - a select-all across the block → raw;
  - undo after a YAML edit restores raw (the selection comes back inside);
  - an `input.external` change of `status: draft` → `status: done` updates the chip label;
  - folding at 0 → no header, placeholder shown; unfolding → header back;
  - malformed block → raw while unfocused;
  - clicking a field chip moves the selection to the key's line;
  - clicking the status chip dispatches `FRONTMATTER_CHIP_EVENT` with `{ kind: "status", key: "status", value }` and leaves the selection unchanged;
  - ArrowRight on a chip moves focus to the next chip, Escape focuses the editor.
- `app/editor/codemirror/frontmatter-block.test.ts`: `bodyStart` (body present, none, document ends at the fence).
- `app/editor/codemirror/heading-fold.test.ts`: folding frontmatter with the caret inside parks it at `bodyStart`.
- `app/editor/codemirror/tag-pills.test.ts`: drop the `.cm-frontmatter-tag-list` and `collectFrontmatterTagLists` cases (:24-62). Add a case asserting that no `.cm-tag-pill` is rendered inside a revealed frontmatter block, while body tags still render.
- Initial caret. `use-codemirror-editor.ts` has no test file, so make it testable without React: put the logic in `frontmatter-block.ts` as `export function withBodyCaret(state: EditorState): EditorState` (returns `state` unchanged when `bodyStart` is null), re-export it from `extensions.ts`, and have the hook call `extensionsModule.withBodyCaret(state)` for notes. Test it in `frontmatter-block.test.ts`: the caret is at the body start; a note without frontmatter, or whose document ends at the fence, is unchanged.

**Phase 2**
- `app/editor/codemirror/frontmatter-header.test.ts`:
  - `setFrontmatterValue` rewrites only the value (bare, quoted, with comment) as one undo step: one `undo()` restores the text;
  - typing right before it isn't merged into the same step;
  - `requestFrontmatterChipAtCaret` is true on a `status:` line and false elsewhere.
- `app/editor/components/FrontmatterStatusMenu.test.tsx` (new): the menu lists the 7 known values with the current one checked; an unknown current value is listed first; choosing calls `onSelect`; Escape calls `onClose`.
- `app/editor/components/markdown-editor/FrontmatterHeaderMenus.test.tsx` (new). Use a real `EditorView` in a container ref and a Jotai `<Provider>`; mock `next/navigation` `useRouter`. Assert:
  - the chip event opens the status menu, and choosing `done` rewrites `status:` in the document;
  - the date event opens the picker, and choosing a day writes `YYYY-MM-DD`;
  - a datetime keeps its `T…` part;
  - after closing, the editor is focused and the caret is moved out of the block when it was inside.
- `app/editor/components/MarkdownEditor.test.tsx`: add the module mock for `FrontmatterHeaderMenus` if the file mocks sibling components; no new behaviour to assert there.

## Docs

- `app/editor/codemirror/frontmatter-block.ts` header comment, plus top-of-file comments in the new files.
- `app/editor/README.md`:
  - add a **Frontmatter header** bullet beside **Frontmatter menu** (:13) covering the chips, reveal rules, raw fallback, status menu and date picker, Ctrl/Cmd+Shift+Enter, and initial caret placement;
  - in the Performance paragraph (:110), change "Tag pills … (plus the frontmatter block)" to note that the frontmatter block no longer gets tag pills, and that the header parses only the block, on edits.
- `app/editor/components/README.md`: index `FrontmatterStatusMenu`.
- `app/editor/components/markdown-editor/README.md`: index `FrontmatterHeaderMenus`.
- `app/editor/components/MarkdownEditor.md`: mention `FrontmatterHeaderMenus` and the status helper in "open helper at cursor".
- `app/editor/components/DatePickerCallout.md`: add the frontmatter header as a caller.
- `app/editor/hooks/` has no README index. Document `use-frontmatter-header.ts` in `FrontmatterHeaderMenus.md` (its only user), as `CalloutTypeMenu.md` does for its hook.
- In-app docs:
  - `app/documentation/content/editor-workspace.tsx:99-129` (Frontmatter section): rewrite the "shown exactly as typed" paragraph to describe the header (chip order, the caret or a click reveals YAML, the status menu, the date picker, raw fallback for complex YAML), keep the fold paragraph, and add `status date chips header` to `keywords`;
  - `app/documentation/content/keyboard-shortcuts.tsx:42`: change the label to "Open helper at cursor (link, date, status, diagram, image)";
  - `app/documentation/content/get-started.tsx:187` needs no change.
- `DESIGN.md`: no new token. In the CSS-only variables table, extend the `--frontmatter-bg` row's usage to "Frontmatter block and header background" and add the missing `--frontmatter-bg-active` (light `rgba(45,58,90,0.085)`, dark `rgba(214,207,198,0.1)`, from `app/globals.scss:77/149`).

## Acceptance criteria

- [ ] With the caret in the body (or the editor unfocused), a note with `type`, `tags`, `status`, `due_date` and `priority` shows one row: `project · #work · #roadmap · in-progress · Due Nov 15 · priority high`, as separate chips, at body size and weight, muted, with no colour.
- [ ] Moving the caret into the block by ArrowUp, a click on the row background, Undo or select-all shows the raw YAML exactly as typed (no tag pills). Leaving it, or blurring the editor, shows the row again.
- [ ] Revealing never changes the font weight or line height of any line.
- [ ] Nested YAML, lists of objects, flow maps, duplicate keys, unbalanced quotes, `{{template}}` fields and blocks with no chips show raw even when the caret is outside.
- [ ] The status menu lists todo, in-progress, done | draft, review, active, archived (an unknown current value first), with the current one checked. Choosing one changes only the value characters; one Cmd/Ctrl+Z restores the previous text.
- [ ] A date chip opens the date picker. Choosing a day writes `YYYY-MM-DD`; a datetime keeps its time. One undo step.
- [ ] Clicking a type, tag or other chip puts the caret on that key's line and reveals the YAML.
- [ ] Chips are reachable with Tab, ArrowLeft and ArrowRight move between them, Enter or Space activates, and Escape returns to the editor. Ctrl/Cmd+Shift+Enter on a `status:` line opens the status menu. No new shortcut was added.
- [ ] Opening a note with frontmatter and a body puts the caret at the body start, so the header shows when focused.
- [ ] Folding and unfolding the frontmatter work as before. After unfolding, the header (not raw YAML) shows.
- [ ] Changing `status:` on disk while the note is open updates the chip with no prompt.
- [ ] Works the same in disk and browser vaults, on desktop and touch. Plain-text files and boards are unaffected.
- [ ] No new network calls. No raw colours. `theme.ts` does not grow. Every changed or new source file is under 400 lines.
- [ ] The tests listed above exist and pass in CI. The docs listed above are updated.

## Decisions

- **Status values:** both lists, per the brief's answer. `todo`, `in-progress`, `done`, a divider, then `WORKFLOW_TAGS`, as `FRONTMATTER_STATUSES` in `components/constants.ts`. `WORKFLOW_TAGS` itself is unchanged, so the `TagPill` colouring is unaffected.
- **Malformed or nested YAML:** show raw, per the brief's answer. The check is a strict synchronous line parser, not js-yaml, because js-yaml is lazily loaded and debounced (`markdown-problems.ts`) and a render can't wait for it. The rules lean toward raw (a bare value with `: `, anchors and tags), so the header rarely disagrees with the YAML notice.
- **Whole-block reveal**, not per line: the brief says the raw YAML is revealed when the caret enters the block. The reveal follows `syntax-reveal.ts`: none while the editor is unfocused.
- **Tag pills are removed inside the frontmatter.** The revealed YAML is "exactly as typed", and the header shows the tags instead.
- **Header tag chips aren't `TagPill`s.** The brief's body-size, muted, no-colour rule wins over `TagPill`'s 0.9em, medium weight and sage workflow colour.
- **Chip labels.** `title` shows its value only (as in the fold summary). Other keys show as `key value`. The date prefix is `Due` for `due_date` / `due`, none for `date`, and the key for other date keys. Tags are capped at 3 plus `+N`, as in `frontmatterSummary`.
- **A block with no chips shows raw**, so the just-inserted `/frontmatter` starter block never becomes an empty row.
- **Initial caret at the body start**, because otherwise every note with frontmatter would open with its YAML revealed. A note whose document ends at the fence keeps the caret there and shows raw, since there's nowhere outside the block to put it.
- **Fold parking at the body start** (`foldSection`), so unfolding returns to the header.
- **Keyboard:** chips are toolbar buttons, and Ctrl/Cmd+Shift+Enter (existing) covers status from the YAML. The existing date-at-caret helper already covers dates.
- **Writes:** value-only splice with `isolateHistory`, not `updateFmFields`, which rewrites the line and re-quotes it.
- **The `type` chip** behaves like the other chips (caret to its line). Plan 002 changes its click to open the type picker. The tag fallback (`#type/…`) is also plan 002's; this plan reads YAML only.

## Out of scope / Deferred

- A raw-mode toggle, Cmd/Ctrl+Shift+Y, a `---` icon or a rendering-mode setting.
- Fading chips while typing.
- Document types, the `/type` picker, `type/…` and `status/…` tag fallbacks, and the shared reader (`app/utils/note-type.ts`): plan 002.
- Adding a missing `status` or date from the header, removing keys, or editing tags or other values from chips.
- Changing `parseFmFields` / `updateFmFields`, the metadata worker or `TagPill`.

## Open questions

- Should a note with frontmatter but an empty `status:` show a placeholder `status` chip that opens the menu? Not built now (the brief only covers existing values).
- Is 3 tags then `+N` right for the header, or should it show every tag and wrap?
- Should `created` / `updated` style date keys be opened in the date picker too? They are today, like any other date chip. Confirm that's wanted, or restrict the picker to `due_date` / `date`.
