# Frontmatter Details card: engineering PRD

Factory mode: this PRD names every file, pattern and constraint the engineer and reviewer need. Read the files it cites, not `ARCHITECTURE.md`/`DESIGN.md`.

## Context

Source: `brief.md`. Frontmatter is shown as a **Details** card at the top of the note: one row per property, with a control chosen from the value. The file keeps the YAML the user wrote, and an edit rewrites only the lines of the property it changes. A `{ }` button (or a setting) shows the YAML text instead. This is an **editor-only** change: the metadata worker, `parseFmFields` and the index are not touched.

What already exists:

1. **Block range.** `app/editor/codemirror/frontmatter-block.ts`:
   - `frontmatterRangeOf(doc)` (:23) returns `{ closeTo }`, the end of the closing `---`, or null. It needs ≥ 3 lines and `---` on line 1. It is cached per `Text`.
   - `frontmatterSummary(state)` (:45) returns the title and tags.
   - `frontmatterSpacer` (:89) adds the gap under the block.
   - `insertOrRevealFrontmatter(view)` (:103) is today's `/frontmatter` command. It inserts `---\ntitle: \ntags: []\n---\n\n` or moves the caret to line 2.
2. **YAML panel and fold.** The block is shown as typed on a tinted panel (`.cm-frontmatter-line`, `highlight.ts` / `theme.ts`). It folds as a level-0 section in `heading-fold.ts` (`frontmatterSection` :44, `isFrontmatterFoldAt` :96, `HeadingFoldWidget(_, true)` :254–255); the folded placeholder shows `frontmatterSummary`. **`theme.ts` is at 483 lines: don't add to it**; put new styles in a new file.
3. **Completion and vocabulary.**
   - `app/editor/utils/frontmatter-vocabulary.ts`: `frontmatterVocabularyOf(index)` (:64, cached per index) returns `{ keys, tags, values }`. `keys` is `COMMON_KEYS` (:17) followed by the vault's keys, most used first. `values[key]` holds the short one-word values most used first, without dates. Private notes are left out.
   - The editor reaches it as `slashMenuCallbacksRef.current.frontmatterVocabulary()` (`app/editor/hooks/use-codemirror-templates.ts:146`).
   - `app/editor/codemirror/frontmatter-completion.ts` is the YAML-mode completion and is unchanged.
4. **Writing frontmatter today.** `app/utils/frontmatter-utils.ts`:
   - `parseFmFields` (:5) is flat and returns strings.
   - `serializeField` (:52) quotes every non-list, non-bare value (`key: "val"`).
   - `updateFmFields` (:73) re-serializes the edited keys and keeps other lines verbatim.
   - `frontmatterList` (:118).

   These stay as they are for their current callers (suggest-properties, privacy toggles, templates). The card needs its own **span-aware** reader and writer, so an edit doesn't re-quote a value or touch other lines.
5. **YAML validity.** `app/editor/codemirror/markdown-problems.ts` lazy-loads `js-yaml` (:137–141) and shows a notice above invalid frontmatter. That check is async. The card's own decision about whether it can show a block must be **synchronous** (see Design › Reader).
6. **Block widget patterns to copy.**
   - Tables: `app/editor/codemirror/table-display.tsx`. `TableEditorWidget` (:172) is a `Decoration.replace({ block: true })` widget built from plain DOM (no React in widgets). It has `eq`/`updateDOM`/`ignoreEvent`, and its cell editing lives in `table-cell-dom.ts` / `table-cell-handlers.ts`.
   - "Edit as Markdown": `app/editor/codemirror/table-source.ts`. `showTableSource` effect plus `tableSourceField` (:28) show the source while the caret is inside and switch back when it leaves. The `{ }` toggle copies this.
   - Dialogs opened from a widget: `app/editor/utils/open-helper-dialogs.ts` dispatches `document` CustomEvents that a mounted React host listens for.
7. **Value editors to reuse.**
   - `app/editor/components/DatePickerCallout.tsx` (props :8–15: `isOpen`, `initialDate`, `keptTime?`, `onSelectDate`, `onClose`). Date-format detection and rewriting: `app/editor/utils/date-detection.ts`.
   - `app/editor/components/WikiLinkDialog.tsx` (props :14–23: `isOpen`, `onClose`, `onConfirm(fileName)`, `onCreateAndConfirm?`, `onCreateFromTemplate?`, `initialValue?`, `title?`).
   - Status words: `WORKFLOW_TAGS` in `app/editor/components/constants.ts:5` (`draft, review, active, archived`).
8. **Commands.**
   - Slash item "Frontmatter" (`constants.ts:229–235`, aliases `yaml, properties, metadata, fm`) → `FRONTMATTER_WIZARD_SENTINEL` → `slash-menu.ts:160` → `onFrontmatterWizard` → `MarkdownEditor.tsx:137` `handleFrontmatterCommand`.
   - AI "Suggest properties": `app/editor/utils/suggest-properties.ts` (`SUGGEST_PROPERTIES_ID` :9), run from `useAIEditorActions.ts:237`. It shows a diff and writes only on Apply.
   - Editor keymap: `app/editor/codemirror/commands.ts:148–161`. **`Mod-i` is italic and `Mod-Shift-i` is insert table**; `Mod-Alt-i` is free.
9. **Wiring and settings.**
   - Extensions are listed in `app/editor/codemirror/extensions.ts` (237 lines): `frontmatterSpacer` :125, `tableDisplayExtension` :139.
   - Compartments are created and reconfigured in `app/editor/hooks/use-codemirror-editor.ts` (:86–128, 292 lines), following the `invisiblesCompartment` pattern.
   - Settings: `app/editor/settings/sections/EditorSettings.tsx`.
   - **`app/atoms/ui-atoms.ts` is at 399 lines** and `MarkdownEditor.tsx` at 383: put the new atom in a new file and the editor wiring in a new hook.
10. **Notes the card must not take over.**
    - Template notes: `isTemplatePath(path, folder)` (`app/utils/templates/template-registry.ts:91`). Their frontmatter holds `{{tokens}}`.
    - Boards: `isBoard(path, content)` (`app/utils/board/is-board.ts:6`).
    - Non-Markdown text files (`plain-text-extensions.ts`) never get the Markdown extension set, so nothing changes for them.
11. **Docs.** User docs: `app/documentation/content/editor-workspace.tsx:122` (section `frontmatter`) and `app/documentation/content/vault.tsx:205` (`frontmatter-conventions`). Component docs: sibling `.md` per component, plus each directory's `README.md`.

Missing:
- (A) a pure reader that maps a block to rows with line spans and value styles;
- (B) a pure writer that changes one row and keeps its style;
- (C) kind inference and labels;
- (D) the card widget, its source mode and its keyboard behavior;
- (E) the add-detail and value dialogs host;
- (F) the setting, commands and shortcut;
- (G) docs.

## Behavior

**When the card shows**
- Display mode `details` (the default) **and** the note is `.md`, not a template note, not a board, **and** the block can be read (Design › Reader). Then the frontmatter's lines (opening `---` through closing `---`) are replaced by the card.
- Otherwise the YAML shows exactly as today (tinted panel, fold, completion). If a block can't be read, the YAML shows with no card and no extra notice. `markdown-problems` still flags invalid YAML.
- Display mode `yaml` (Settings → Editor → **Frontmatter: Details / YAML**): never a card. Everything stays as today.
- A note without frontmatter shows nothing: no card and no placeholder.

**The card**
- One row per top-level key, in file order, as `Label · value`.
- Labels are humanized (Design › Labels). Hovering a label shows the real key (`title` attribute).
- **Long blocks:** with more than 6 rows, rows 7 and later are hidden behind a final "Show all (N)" row, which expands the card until the note is closed (state kept per editor view, not persisted).
- **Footer:**
  - "+ Add detail" (left).
  - `{ }` icon button, `aria-label="Edit as YAML"` (right).
- No fold chevron in details mode: `heading-fold.ts` does not offer the frontmatter fold while the card is showing (it does in yaml mode and when the card falls back).
- On phones the card uses the same layout. Rows are ≥ 44px tall and the footer buttons are ≥ 44px.

**Value kinds and controls.** Inferred per row (Design › Kinds), never stored anywhere:

| Kind | Shown as | Editing |
|---|---|---|
| `text` | the value, one line, ellipsis | click → inline editable; Enter or blur commits; Esc cancels |
| `number` | the value | as text; a non-number is kept as text (kind changes) |
| `date` | localized `Nov 1, 2026` (`toLocaleDateString(undefined, { dateStyle: "medium" })`); a datetime also shows its time | click → `DatePickerCallout`, with `keptTime` for a datetime; written back in the value's own format (`date-detection.ts`) |
| `status` | a pill | click → menu: this key's vault values (`vocabulary.values[key]`), then `WORKFLOW_TAGS` not already listed, then "Other…" (inline text) |
| `list` | token pills, then a `+` | `+` → inline input with completion from `vocabulary.tags` (for `tags`/`aliases`) or this key's values; Enter adds; Backspace in the empty input removes the last; × on a token removes it |
| `link` | `↗ Note name` pill | click the pill → opens the note (same path as Ctrl/Cmd+click on a wikilink). Pencil / Enter → `WikiLinkDialog` with `initialValue` |
| `boolean` | a switch | click / Space toggles and commits at once |
| `complex` | the raw value, dimmed, one line | click → source mode, caret on that key's line |

**Editing rules**
- Each commit is **one** CodeMirror transaction (`userEvent: "input.frontmatter"`), so it is one undo step. It replaces only the edited row's span (Design › Writer).
- An unchanged commit dispatches nothing.
- **Removing a row:** hover × at the row's end (always visible on touch), or Backspace / Delete on an empty text value followed by Enter. Removal deletes the row's lines.
- **Removing the last row** removes the whole block, plus the single blank line after it if there is one. The card disappears.
- Edits go through the document, so autosave, the file watcher and the conflict dialog apply unchanged.

**Adding a detail**
- **Entry points:**
  - "+ Add detail" in the card.
  - Slash command **Details** (it replaces the "Frontmatter" item; aliases `frontmatter, yaml, properties, metadata, fm, info`).
  - Palette command **Add Detail…** (category Document).
  - `Mod-Alt-i`.
- With a card showing, `Mod-Alt-i` and the slash command focus the first row's value. If the card has no rows to focus, they open Add.
- Add opens **AddDetailDialog** (a `DialogModal`, title "Add detail"):
  - **Suggestions:** up to 8 chips. They are `vocabulary.keys` minus the keys the block already has, in vocabulary order (common keys first), each shown with its humanized label.
  - **Suggest:** a "✨ Suggest" chip when AI is configured (`atom_isAiConfigured`). It closes the dialog and runs the existing Suggest properties action, with its diff review.
  - **Name field:** an `Input` "Or type a name". Enter adds a key with that name, sanitized to `[A-Za-z_][\w-]*` (spaces → `_`, other characters dropped). If the result is empty or the key already exists, the dialog shows an inline error and stays open.
- **Picking a key:**
  1. Write `key: ` with an empty value through the writer. A note without a block gets a new block at the top (Design › Writer › new block).
  2. Close the dialog.
  3. Open that row's editor at once: a date key opens the date picker; a status key opens its menu; every other key opens the inline text editor.

  The kind of a new, empty row comes from its key (Design › Kinds).
- **Abandoning a new row:** if its editor closes with the value still empty, the row stays as `key:` (valid YAML, shown with a dimmed "Empty" placeholder). Nothing is rolled back: the empty key is the user's choice to keep or remove.

**Source mode (`{ }`)**
- `{ }` (or clicking a `complex` value) shows the YAML lines as today, puts the caret at the end of line 2 (or on that key's line), and focuses the editor.
- The YAML stays visible while the caret is inside the block's lines, even while an edit leaves the block unreadable for a moment. The card returns when the caret leaves the block, if the block can then be read.

**Keyboard**
- **Inside the card:**
  - Tab / Shift+Tab move between row values, then "+ Add detail", then `{ }`.
  - Enter opens or commits the focused value.
  - Esc commits pending text, then returns focus to the editor at the first body line.
- **From the card into the text:** ArrowDown from the last row (or from the footer) goes to the first body line.
- **From the text into the card:** ArrowUp on the first body line (caret on line `closeTo`+1) focuses the card's last row. This is an editor keymap entry that applies only when the card is showing.
- **Vim mode:** the card is still shown. `Mod-Alt-i` and the mouse reach it. No Vim motions are added.

**Edge cases**
- Duplicate keys: both rows show. Editing changes that row's span only.
- Comment lines (`# …`) and blank lines inside the block are kept as they are. They are not rows; they stay attached to the row above them, or to the block start (Design › Reader).
- `private: true` is a `boolean` row labeled "Private". Toggling it changes the YAML, and `PrivateNoteGate` reacts as it does to typed edits today.
- A very large note: the reader only reads the block's lines (`frontmatterRangeOf` + `doc.sliceString(0, closeTo)`), never the whole note.
- An external change to the frontmatter while a value is being edited: the widget rebuilds from the new document. A pending inline edit is dropped when its row's span changed (it's compared by the row's text).

## Design

**Display atom.** New file `app/atoms/frontmatter-atoms.ts`:

```ts
export type FrontmatterDisplay = "details" | "yaml";
export const atom_frontmatterDisplay = atomWithStorage<FrontmatterDisplay>("frontmatterDisplay", "details");
```

**Reader (pure).** New file `app/utils/frontmatter/property-rows.ts`. No CodeMirror, no React.

```ts
export type ValueStyle = "bare" | "single" | "double" | "flow-list" | "block-list" | "empty" | "complex";
export interface PropertyRow {
  key: string;
  /** Offsets in the note: the key line's start through the end of its last continuation line. */
  from: number;
  to: number;
  /** The value as the user means it: unquoted scalar, or list items unquoted. */
  value: string | string[];
  style: ValueStyle;
  /** The original row text, used to detect a stale pending edit. */
  raw: string;
}
export interface PropertyBlock { rows: PropertyRow[]; closeTo: number }
/** null when the block can't be shown as a card. */
export function readPropertyBlock(text: string, closeTo: number): PropertyBlock | null;
```

`text` is `doc.sliceString(0, closeTo)`, and offsets are into it (the same as note offsets, since the block starts at 0).

Each top-level line, between line 2 and the line before the closing fence:
- **`key: value` (column 0).** Its style comes from the value:
  - `"…"` → `double`, `'…'` → `single`;
  - `[…]` on one line → `flow-list` (items split on commas outside quotes, then unquoted);
  - empty, followed by indented `- item` lines → `block-list`;
  - empty with no continuation → `empty`;
  - `|`/`>` block scalar, or an empty value followed by indented `key:` lines (a nested map) → `complex` (the value is the raw continuation joined with `\n`);
  - anything else → `bare`.

  Continuation lines (indented) belong to the row.
- **`#` comment or blank line:** not a row. It extends the previous row's `to` (or stays before the first row).
- **Anything else at column 0** (a bare `- item`, a line without `key:`, a `?` key, an anchor `&`/alias `*` value, a tab-indented continuation): return **null**.
- Return null when there is no closing fence or no rows.

**Writer (pure).** New file `app/utils/frontmatter/property-write.ts`:

```ts
export interface TextChange { from: number; to: number; insert: string }
export function setPropertyChange(row: PropertyRow, value: string | string[]): TextChange;
export function addPropertyChange(block: PropertyBlock | null, key: string, value?: string | string[]): TextChange;
export function removePropertyChange(block: PropertyBlock, row: PropertyRow, docText: string): TextChange;
export function needsQuotes(value: string): boolean;
```

- **`setPropertyChange`** rewrites `row.from..row.to` as one row, keeping trailing comment lines that belonged to it. Scalars keep the row's quote style.
  - A `bare` or `empty` value becomes `double` when `needsQuotes` is true. `needsQuotes` covers: leading or trailing space; a leading `[ { & * ! | > % @` or backtick; `: ` or ` #` inside; `true`/`false`/`null`/`~`/`yes`/`no` as text; a value that looks like a number when the kind is text; a wikilink `[[…]]`. Wikilinks are **always** double-quoted, because `[[A]]` unquoted is a nested YAML list.
  - Lists keep `flow-list` / `block-list` style. Items are quoted only when `needsQuotes` is true. Block lists use two-space `- ` indentation, matching the first existing item's indent.
  - Double-quoted output escapes `\` and `"`.
- **`addPropertyChange`** with a block inserts `key: <value>` as a new line just before the closing fence, keeping that line's newline style. A list value is written flow style (`tags: [a, b]`).
  - Without a block, it inserts `---\nkey: <value>\n---\n\n` at offset 0. If the note's first line is empty, it inserts `---\nkey: <value>\n---\n`.
  - An empty value writes `key:` with no trailing space.
- **`removePropertyChange`** deletes the row's lines with their newline. If it is the last row, it deletes the whole block (0..`closeTo`) plus one following newline, and one blank line if one follows.

**Kinds and labels (pure).** New file `app/utils/frontmatter/property-kinds.ts`:

```ts
export type PropertyKind = "text" | "number" | "date" | "status" | "list" | "link" | "boolean" | "complex";
export function inferPropertyKind(row: Pick<PropertyRow, "key" | "value" | "style">, vocabulary: FrontmatterVocabulary): PropertyKind;
export function kindForNewKey(key: string): PropertyKind;
export function humanizeKey(key: string): string;
```

`inferPropertyKind` takes the first rule that matches:
1. `complex` style → `complex`.
2. A list style, or key `tags` / `aliases` → `list`.
3. The value matches `^\[\[[^\]]+\]\]$` → `link`.
4. `true` / `false`, any case → `boolean`.
5. A date or datetime that `date-detection.ts` recognises, as the **whole** value (ISO `YYYY-MM-DD`, ISO datetime, `[[YYYY-MM-DD]]`, slashed, dotted) → `date`.
6. Key `status` / `state` / `stage`, or key with `vocabulary.values[key].length >= 2` and the value one of them → `status`.
7. A finite number `^-?\d+(\.\d+)?$` → `number`.
8. Otherwise → `text`.

An empty value uses `kindForNewKey(key)`:
- `date`: `date`, `created`, `updated`, `modified`, `due`, `start`, `end`, `deadline`, and any key ending in `_date`, `-date`, `Date`, `_at`;
- `status`: `status`, `state`, `stage`;
- `list`: `tags`, `aliases`;
- `boolean`: `private`, `draft`, `done`, `archived`, `pinned`;
- `text`: any other key.

`humanizeKey` splits on `_`, `-` and camelCase boundaries and capitalizes the first word: `due_date` → "Due date", `createdAt` → "Created at". It uses fixed labels for `tags` "Tags", `aliases` "Aliases", `private` "Private" and `url` "URL".

**Card widget.** New files:
- `app/editor/codemirror/details-card.ts`: the StateField, decorations, source-mode effect and keymap.
- `app/editor/codemirror/details-card-dom.ts`: builds the widget's DOM and handles events; split into `details-card-editors.ts` if it gets past 400 lines.
- `app/editor/codemirror/details-card-theme.ts`: the styles, as an `EditorView.baseTheme` or a theme extension.

```ts
export const showFrontmatterSource = StateEffect.define<number>(); // caret pos inside the block
export const frontmatterSourceField: StateField<number | null>;     // same rules as tableSourceField
export interface DetailsCardState { block: PropertyBlock | null; decorations: DecorationSet }
export const detailsCardField: StateField<DetailsCardState>;
export function detailsCard(opts: { vocabulary: () => FrontmatterVocabulary; eligible: () => boolean }): Extension;
export function focusDetailsCard(view: EditorView, where: "first" | "last"): boolean; // false when no card
```

- **The field.**
  - Rebuilds only when the transaction changes the doc inside `0..closeTo+1`, adds or removes the block, or carries a source / eligibility effect.
  - Shows no card when `eligible()` is false, when `frontmatterSourceField` is set, or when `readPropertyBlock` returns null.
  - Otherwise it is `Decoration.replace({ widget, block: true, inclusive: true }).range(0, closeTo)`.
- **The widget.** Plain DOM, like `TableEditorWidget`:
  - `eq` compares `block.rows.map(r => r.raw)`, the expanded flag and the vocabulary's identity;
  - `updateDOM` patches row values in place when the keys are unchanged;
  - `ignoreEvent()` returns true;
  - `contenteditable="false"` on the wrapper; inline text editing uses a `contenteditable` span (as `table-cell-dom.ts` does).
  - Each row has `role="group"` and `aria-label="<Label>"`. The switch has `role="switch"` and `aria-checked`.
- **Dialogs.** The date picker, link picker and Add are opened by `document` events added to `open-helper-dialogs.ts`:

  ```ts
  export const DETAILS_DATE_EVENT = "hermes:details-date";  // detail: { view, rowKey, rowRaw, value }
  export const DETAILS_LINK_EVENT = "hermes:details-link";  // detail: { view, rowKey, rowRaw, value }
  export const DETAILS_ADD_EVENT  = "hermes:details-add";   // detail: { view }
  export function openDetailsDate(...): void; export function openDetailsLink(...): void; export function openDetailsAdd(view: EditorView): void;
  ```

  The host re-reads the block when the dialog confirms and finds the row by key and `raw`. A row that is gone or changed drops the edit with `toast.error("The details changed while you were editing. Try again.")`.
- **The status menu** is a small DOM popover inside the widget, using the menu classes in `app/editor/components/menu-classes.ts`. It closes on Esc or on a click outside.
- **Fold:** `heading-fold.ts` skips the frontmatter section (`frontmatterSection` returns null and no chevron is drawn) when `state.field(detailsCardField, false)?.block` is set. This is the only change to `heading-fold.ts`.
- **Spacer:** `frontmatterSpacer` stays as it is. The gap under the card stays the same.

**Dialog host.** New component `app/editor/components/DetailsDialogs.tsx` (+ `DetailsDialogs.md`), mounted once in `app/editor/page.tsx`, next to `RenderedBlockSourceDialog`. It listens for the three events and renders:
- `DatePickerCallout`, writing through `setPropertyChange` in the value's own format;
- `WikiLinkDialog`, which writes `"[[Name]]"`;
- `AddDetailDialog` (new file `app/editor/components/AddDetailDialog.tsx` + `.md`):

  ```ts
  props { isOpen; existingKeys: string[]; vocabulary: FrontmatterVocabulary; aiAvailable: boolean; onPick(key: string): void; onSuggest(): void; onClose(): void }
  ```

  It uses `DialogModal`, the chips are `Button variant="outlined"`, and the name field is `Input`.

**Commands and wiring.** New hook `app/editor/hooks/use-details-card.ts`:
- **`compartment`:** owns a Compartment, created in `use-codemirror-editor.ts` the way `invisiblesCompartment` is. It reconfigures the compartment when `atom_frontmatterDisplay` or the note's eligibility changes.
- **`addDetail()`:** the slash / palette / shortcut action. It calls `focusDetailsCard`, or else `openDetailsAdd`. In yaml mode it calls `insertOrRevealFrontmatter` as today.
- **Eligibility:** `!isTemplatePath(path, templatesFolder) && !isBoard(path, content)`.
- **`MarkdownEditor.tsx`:** `handleFrontmatterCommand` calls the hook's `addDetail`. Its net growth is ≤ 5 lines.
- **Slash item:** `constants.ts` label "Details", description "Add or edit this note's details", aliases as in Behavior; same sentinel.
- **Palette:** "Add Detail…" (with the editor commands in `app/editor/components/editor-commands/`, category Document, shortcut shown as `formatShortcut("Mod-Alt-i")`) and "Show Details as YAML" / "Show Details as Card", which flip `atom_frontmatterDisplay`.
- **Keymap:** `Mod-Alt-i` → `addDetail`, registered in `details-card.ts`'s keymap (`Prec.high`) so it works only in Markdown editors. The ArrowUp-into-card binding is in the same keymap.
- **Settings:** `EditorSettings.tsx` gets a segmented control **Frontmatter** with `Details` / `YAML` (`Button variant="segment"`).

## Phase 1: Reader, writer, kinds (pure)

- Add `property-rows.ts`, `property-write.ts`, `property-kinds.ts` and `app/utils/frontmatter/README.md`.
- Unit tests, including round-trip: for every fixture, `set` with the row's own value is a no-op (`insert === original slice`).

## Phase 2: Card widget, source mode, inline editing

- Add `frontmatter-atoms.ts`, `details-card.ts`, `details-card-dom.ts`, `details-card-theme.ts`, the compartment, `use-details-card.ts`, the `heading-fold.ts` guard and the Settings control.
- Text, number, status, list, boolean and complex rows work inline. Date and link rows open their dialogs (Phase 3).

## Phase 3: Dialogs, Add, commands, docs

- Add `DetailsDialogs`, `AddDetailDialog`, the `open-helper-dialogs` events, the slash relabel, the palette commands and `Mod-Alt-i`.
- Write the docs.

## Tests

- **`property-rows.test.ts`.** Each style is read with correct spans:
  - bare, double, single and empty values;
  - flow list with quoted commas;
  - block list;
  - block scalar and nested map → `complex`;
  - comment and blank lines attached to the previous row;
  - CRLF line endings;
  - null for top-level `- item`, anchors and aliases, and a missing closing fence;
  - duplicate keys.
- **`property-write.test.ts`.**
  - Round-trip no-ops.
  - Quote style is kept.
  - `needsQuotes` cases.
  - Wikilinks are always quoted.
  - List edits in both styles.
  - Add with and without a block, and on an empty first line.
  - Removing a middle row, the last row (block and blank line removed) and a row with a trailing comment.
  - Escaping `"` and `\`.
- **`property-kinds.test.ts`.** Every rule in order, `kindForNewKey`, and `humanizeKey` cases.
- **`details-card.test.ts`** (EditorState / EditorView in jsdom):
  - the card replaces exactly `0..closeTo`;
  - no card for a template path, a board, yaml mode or an unreadable block;
  - `showFrontmatterSource` shows the YAML until the caret leaves;
  - a toggle commit is one transaction and one undo step;
  - removing the last row removes the block;
  - `Mod-Alt-i` focuses the card or dispatches `DETAILS_ADD_EVENT`;
  - ArrowUp from the first body line focuses the card;
  - an edit outside the block doesn't rebuild the widget (spy on the reader).
- **`heading-fold` test:** no frontmatter fold while the card shows; there is one in yaml mode.
- **`AddDetailDialog.test.tsx`:**
  - suggestions exclude existing keys and are capped at 8;
  - Suggest shows only with AI configured;
  - a typed name is sanitized;
  - a duplicate or empty name shows an error;
  - `onPick` gets the key.
- **`DetailsDialogs.test.tsx`:**
  - a date pick writes back in the original format (`2026-11-01` → ISO; a datetime keeps its time);
  - a link pick writes `"[[Name]]"`;
  - a stale row shows the toast and writes nothing.
- **`EditorSettings.test.tsx`:** the Frontmatter control flips the atom.
- All component tests wrap in `<Provider>`, mock `useRouter` and `useFileSystem`, and seed atoms through the store (`AGENT_RULES.md`).

## Docs

- **`editor-workspace.tsx` → section `frontmatter`.** Rename the title to "Details (frontmatter)" and keep the id `frontmatter`. Rewrite it to cover:
  - the card and its value kinds;
  - Add detail and its chips;
  - `{ }` and the setting;
  - `Mod-Alt-i`;
  - that the file stays plain YAML;
  - that template notes and boards always show YAML.

  Keep the YAML-mode paragraphs (fold, completion) under "YAML view". Add the keywords `details card add detail properties info`.
- **`vault.tsx` → `frontmatter-conventions`:** one sentence on how values are written (quotes only when needed; wikilinks always quoted).
- **Component docs:** `DetailsDialogs.md`, `AddDetailDialog.md`, and the `app/editor/README.md` entries for the three new `codemirror/` files.
- **Directory READMEs:** `app/utils/frontmatter/README.md`, and the `app/atoms/README.md` entry for `frontmatter-atoms.ts`.
- **`ARCHITECTURE.md`:** in "CodeMirror 6 editor", one clause: "the frontmatter as a Details card (`details-card.ts`, pure rows / writer in `utils/frontmatter/`)".

## Acceptance criteria

1. A note with `title`, `tags: [a, b]`, `due: 2026-11-01`, `status: draft` and `private: false` shows a card with Title (text), Tags (two tokens), Due ("Nov 1, 2026"), Status (pill) and Private (switch). The YAML lines aren't visible.
2. Changing the status to `review` changes only that line, to `status: review`; every other byte of the file is identical. Undo restores it in one step.
3. Picking a date writes `due: 2026-11-08`, in the same format. A datetime value keeps its time.
4. Adding `project` from the chips and linking "Alpha" writes `project: "[[Alpha]]"`, and the pill opens Alpha.
5. On a note with no frontmatter, `Mod-Alt-i` opens Add. Picking "Status" creates `---\nstatus:\n---\n\n` at the top and opens the status menu.
6. Removing the last row removes the block and the blank line after it.
7. `{ }` shows the YAML with the caret inside. Moving the caret into the body brings the card back.
8. A block with a nested map shows that row as `complex`, and clicking it opens source mode on that line. A block with a top-level `- item` shows plain YAML, with no card.
9. Template notes and boards show plain YAML. With Settings → Frontmatter → YAML, every note shows YAML, the fold chevron is there, and completion works as today.
10. Typing anywhere in the body doesn't rebuild the card. A note with 5,000 lines opens with no measurable change in time to first paint (existing `editor-performance.bench.ts` within noise).
11. Every new source file is under 400 lines. `ui-atoms.ts`, `theme.ts` and `MarkdownEditor.tsx` grow by ≤ 5 lines each.
12. Typecheck, lint and the full test suite pass in CI.

## Decisions

- **Editor-only.** The metadata worker, `parseFmFields`, `FileMetadata.frontmatter` and the index are not changed. Typed values in the index, and recording which key a link came from, are a later plan (properties table, grouped backlinks).
- **A conservative reader over js-yaml.** A synchronous, span-aware reader that refuses what it doesn't understand keeps the user's formatting and never rewrites YAML it can't represent. js-yaml stays only for the validity notice.
- **No schema.** Kinds are inferred on every render and never stored. A wrong guess costs one click on `{ }`.
- **`Mod-Alt-i`, not `Mod-i`.** `Mod-i` is italic.
- **No fold in details mode.** The card is compact by design (6 rows, then "Show all"). Folding stays in yaml mode.
- **The slash item is renamed "Details".** Old aliases (`frontmatter`, `yaml`, `properties`) still find it.

## Out of scope / Deferred

- Typed metadata index, grouped backlinks, backlinks panel.
- Properties table view, board grouped by property.
- Reordering rows, renaming keys from the card (use `{ }`), editing nested maps or block scalars in the card.
- Per-type key suggestions (`type: project` → its keys) and template packs for types.
- Vim motions inside the card.

## Open questions

None blocking. The engineer may adjust labels and the 6-row limit if the design review asks; record any change in `mailbox.md`.
