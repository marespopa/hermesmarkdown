# 🗃️ HermesMarkdown — Table Feature Handoff

> **Feature:** Full table support — parsing, inline rendering, dialog, editing, sorting
> **Branch:** `feat/tables`
> **Milestone:** v0.2 (core) → v0.3 (sorting, inline shortcuts) → v0.4 (serialization polish)
> **Last updated:** 2026-06-06

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Syntax & Parsing](#syntax--parsing)
4. [Inline Rendering](#inline-rendering)
5. [Table Dialog — Create Mode](#table-dialog--create-mode)
6. [Table Dialog — Edit Mode](#table-dialog--edit-mode)
7. [Sorting](#sorting)
8. [Inline Editing (Source)](#inline-editing-source)
9. [Serialization](#serialization)
10. [Mobile & Tablet](#mobile--tablet)
11. [Accessibility](#accessibility)
12. [Component Breakdown](#component-breakdown)
13. [Out of Scope](#out-of-scope)
14. [Milestones & Acceptance Criteria](#milestones--acceptance-criteria)

---

## Overview

Tables are the most structurally complex element in HermesMarkdown. They touch four distinct layers:

- **Parsing** — reading GFM table syntax into structured data
- **Rendering** — displaying the table inline in the editor (no separate preview pane)
- **Editing** — a dialog for creating and restructuring tables visually
- **Serialization** — writing structured data back to valid Markdown

HermesMarkdown renders tables inline (Typora-style). There is no separate preview pane. The editor switches between source view and rendered view per block, or the table renders in place as the user types.

---

## Architecture

```
Raw Markdown source
       │
       ▼
  tableParser          → TableData { headers[], rows[][], alignments[] }
       │
       ├──▶ TableRenderer    → Inline rendered table (editor view)
       │
       ├──▶ TableDialog      → Visual editing UI (create / edit mode)
       │         │
       │    tableSorter      → Sort rows by column, numeric detection
       │
       └──▶ tableSerializer  → Back to Markdown string → replaces source block
```

`tableParser` and `tableSerializer` are pure functions with no UI dependency. They can be tested in isolation and reused by the CLI.

---

## Syntax & Parsing

### Supported Syntax

Standard GFM table syntax:

```
| Header 1 | Header 2 | Header 3 |
|:---------|:--------:|---------:|
| Cell     | Cell     | Cell     |
| Cell     | Cell     | Cell     |
```

### Alignment Encoding

| Separator | Alignment |
|-----------|-----------|
| `---` or `:---` | Left (default) |
| `:---:` | Center |
| `---:` | Right |

### Parser Rules

- Leading and trailing pipes are **optional** in GFM — `Header 1 | Header 2` is valid. The parser normalizes both forms on input.
- Whitespace around cell content is trimmed — `|  cell  |` becomes `cell`.
- Escaped pipes `\|` inside cells are treated as literal `|`, not a column separator.
- The separator row **must be the second row**. A table without a separator is not a table — it's plain text with pipes. Do not attempt to auto-detect.
- Unequal column counts across rows are handled by padding shorter rows with empty cells. Rows with more columns than the header are truncated (or preserved as-is — define and document the choice).
- A table with only a header row and separator (no data rows) is valid and should parse successfully.
- A single `| one |` line with no separator below it is **not** a table.
- Empty header cells (`|  | Header 2 |`) are valid.
- `||` as a separator row is not valid.

### Edge Cases

| Case | Expected Behavior |
|------|------------------|
| `\|` inside a cell | Renders as literal `\|` in source, `|` in output |
| Inline Markdown inside cells | Parsed as-is; bold, italic, inline code, smart tags all valid |
| Images inside cells | Supported; cap render height so rows don't expand excessively |
| Nested tables | Not supported; inner pipes treated as escaped or literal text |
| Misaligned column counts | Pad short rows; truncate or preserve long rows (document the choice) |
| Non-letter smart tags (`#1`) inside cells | Follow standard smart tag rules — digit-only excluded |
| Code blocks inside cells | Not supported; inline code only (`\`code\``) |
| Frontmatter-like content in a cell | Treated as plain text |

---

## Inline Rendering

Tables render **inline in the editor** — no separate pane. When the cursor is outside the table block, it renders as a formatted table. When the cursor enters the block, it can switch to source (or stay rendered with an active cell, depending on implementation choice — define this early).

### Rendering Rules

- Header row renders as a visually distinct row (bold or background)
- Alignment from the separator row maps to `text-align` per column
- Inline Markdown inside cells renders (bold, italic, inline code, smart tags)
- Tables wider than the editor viewport scroll **horizontally within their block** — the surrounding document does not scroll with it
- Font size inside cells may be slightly reduced from body text to accommodate more columns (define the value — suggest 0.9em)
- All-empty data rows render as blank rows — do not collapse them

### Edge Cases

| Case | Expected Behavior |
|------|------------------|
| Very long cell content | Wraps within the cell; does not force column to expand |
| Very wide table (8+ columns) | Horizontal scroll on the table block only |
| Cell containing only whitespace | Renders as empty cell |
| Emoji in cells | Render correctly; affects column width calculation in serialization |
| Very large table (50+ rows) | Editor remains responsive; consider row virtualization |

---

## Table Dialog — Create Mode

### Trigger Points

| Trigger | Behavior |
|---------|----------|
| Toolbar "Table" button | Opens dialog in create mode, blank 3×3 default |
| Slash command `/table` | Same as toolbar |
| Keyboard shortcut (TBD) | Same as toolbar |

### Default State

- 3 columns, 3 rows (1 header + 2 data rows)
- All alignments default to left
- All cells empty
- Focus lands on the first header cell

### Wireframe

```
┌─────────────────────────────────────────────┐
│  Insert Table                            ✕  │
├─────────────────────────────────────────────┤
│  Columns: [ − ]  [ 3 ]  [ + ]               │
│  Rows:    [ − ]  [ 3 ]  [ + ]               │
├─────────────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────┐         │
│  │ Header 1 │ Header 2 │ Header 3 │         │
│  ├──────────┼──────────┼──────────┤         │
│  │          │          │          │         │
│  │          │          │          │         │
│  └──────────┴──────────┴──────────┘         │
│                                             │
│  Alignment per column:  [L]  [C]  [R]       │
│                                             │
│  ▼ Markdown source preview (read-only)      │
│  | Header 1 | Header 2 | Header 3 |         │
│  |:---------|:---------|:---------|         │
│  |          |          |          |         │
│                                             │
│            [ Cancel ]  [ Insert Table ]     │
└─────────────────────────────────────────────┘
```

> **Note:** The preview strip shows raw Markdown source, not rendered HTML. There is no preview pane.

### Behavior: Adding a Column

- Appends a new empty column to the right
- New header cell auto-focuses
- Alignment defaults to left

### Behavior: Removing a Column

- If column is empty → removes immediately
- If column has content → inline warning: *"This column has content. Remove anyway?"* with confirm/cancel inline (not a second modal)

### Behavior: Adding a Row

- Appends an empty row at the bottom
- First cell of the new row auto-focuses

### Behavior: Removing a Row

- Same empty/content logic as columns
- The header row (row 0) **cannot be removed**

### Behavior: Tab Navigation

- `Tab` moves to the next cell, wraps to the first cell of the next row
- `Tab` on the last cell of the last row **adds a new row** and focuses its first cell
- `Shift+Tab` moves backwards

### Behavior: Alignment

- Per-column L / C / R toggle buttons
- Default is L
- Updates the separator row in Markdown output: `:---|`, `:---:`, `---:`
- Clicking the active alignment again does nothing (no deselect to "no alignment")

### Behavior: Insert

- Serializes dialog state to a Markdown table string
- Inserts at the current cursor position in the source
- Dialog closes

### Behavior: Cancel / Escape

- Discards all input
- Closes dialog
- Cursor position in the source is restored

---

## Table Dialog — Edit Mode

### Trigger Points

| Trigger | Behavior |
|---------|----------|
| Cursor inside existing table + "Edit Table" button/command | Opens dialog in edit mode |
| Double-click on inline-rendered table | Opens dialog in edit mode |

### Parsing into the Dialog

When opening edit mode:

1. Detect the cursor is inside a Markdown table block
2. Extract the full table source (from first `|` line to last)
3. Split rows, split cells on `|`, trim whitespace
4. Read alignment from the separator row
5. Populate the dialog grid with parsed values
6. Store a snapshot of the original source for cancel/escape

### Differences from Create Mode

- Button reads **"Update Table"** instead of "Insert Table"
- Grid is pre-filled with parsed cell content and alignment
- Adding a column appends it on the right with empty cells for all existing rows
- Reducing column count below existing: confirmation prompt stating how many columns of content will be lost
- Reducing row count below existing: confirmation prompt stating how many rows of content will be lost

### On Confirm (Update Table)

- Serialize dialog state to Markdown
- Replace only the table block in the source — preserve all surrounding content
- Cursor is placed at the start of the updated table

### Edge Cases

| Case | Expected Behavior |
|------|------------------|
| Malformed table (unequal cols, missing separator) | Show warning; offer to open best-effort parse or cancel |
| Very large table (50+ rows) | Dialog opens; grid virtualizes rows if needed for performance |
| Cell containing inline Markdown | Display raw source in cell input (`**bold**`); Markdown source preview reflects it |
| Cell containing `\|` (escaped pipe) | Display as `\|` in cell input; serialize back as `\|` |
| Pasting multi-line content into a cell | Strip newlines; keep as single line |
| User edits a cell after sorting, then resets sort | Edited value persists; original row order restores around it |

---

## Sorting

### Overview

Sorting is an in-dialog operation. Clicking a column header sorts the data rows by that column. The sorted order is what gets inserted or updated. The header row never participates in sorting.

### Sort Cycle

Clicking a column header cycles through:

```
None → Ascending ↑ → Descending ↓ → None (original order)
```

Clicking a **different** column header resets the previous sort and starts ascending on the new column.

### Numeric vs. Alphabetic Detection

At sort time, check every non-empty cell in the column. If all can be parsed as `parseFloat`, use numeric comparison. Otherwise use locale-aware string comparison (`localeCompare`). This is per-sort, not stored on the column.

### Original Order Snapshot

A snapshot of the unsorted row array is taken when the dialog opens (or when edit mode loads). When cycling back to `none`, rows are restored from this snapshot — not from the current display order.

Always sort **from the snapshot**, never from the currently displayed rows. This prevents compounding sort errors across direction toggles.

### Sorting is Mutating

Sorting reorders rows in place in the dialog state. There is no view-only sort layer. The serialized output reflects the sorted order.

### UI

- Sort indicator appended to the header cell label: `↑` (asc), `↓` (desc), nothing (none)
- Inactive sortable headers show a faint `↕` on hover to signal they are clickable
- Sort state resets if the user adds or removes a column

### Edge Cases

| Case | Expected Behavior |
|------|------------------|
| Mixed numeric/text column | Fall back to string sort for the whole column |
| Cells with inline Markdown | Sort on raw source value (`**apple**` sorts as `**apple**`) |
| Empty cells | Sort to the bottom regardless of direction |
| Sorting then adding a row | New row appends after sort; becomes part of the sortable set |
| Sorting then removing a column | Sort state resets — column index is no longer valid |
| All cells in column are empty | No-op sort; order unchanged |

---

## Inline Editing (Source)

Users can edit table source directly without opening the dialog. The parser handles whatever they type. Additional convenience behaviors:

### Auto-escape `|`

When the cursor is inside a table cell in source mode and the user types `|`, HermesMarkdown intercepts and inserts `\|` instead. This prevents accidental column splitting.

This requires the editor to maintain **table cursor context** — awareness that the caret is inside a table block and which row/column it is in.

### Tab Key in Table Source

`Tab` while inside a table row in source moves the cursor to the next cell (jumps to the next `|` delimiter). `Shift+Tab` moves backwards. This is a power-user feature and should be toggleable in settings.

### Enter Key at End of Table Row

Pressing `Enter` at the end of a table row inserts a new empty row below, matching Notion/Typora behavior. This is optional and should be toggleable.

### Table Cursor Context

The editor must track:

- Whether the caret is inside a table block
- Which row index (0 = header, 1+ = data)
- Which column index
- The start/end character offsets of the current cell

This context is used by: auto-escape, Tab navigation, Enter behavior, and the "Edit Table" trigger.

---

## Serialization

### Output Format

```
| Header 1 | Header 2 | Header 3 |
|:---------|:--------:|---------:|
| Cell     | Cell     | Cell     |
| Cell     | Cell     | Cell     |
```

### Pretty-print vs. Compact

- **Pretty-print** (default): columns are padded with spaces so they align visually in source
- **Compact**: no padding, minimal output

This should be a user preference in settings. The serializer supports both modes.

### Pretty-print Rules

- Calculate the maximum content width per column across all rows (including header and separator)
- Pad all cells to that width with trailing spaces
- The separator row uses `-` for padding: `:--------`
- Set a **maximum padding width** (suggested: 40 characters) — cells longer than this are not padded, to prevent unreadable source for very long content

### Alignment Separator Output

| Alignment | Separator |
|-----------|-----------|
| Left | `:------` or `------` |
| Center | `:------:` |
| Right | `------:` |

HermesMarkdown uses `:---` for left alignment (explicit) rather than `---` (implicit). This is a style choice — document it.

### Round-trip Fidelity

Parse → serialize with no user changes should produce semantically identical output. Byte-identical output is a stretch goal. Acceptable differences: whitespace normalization, consistent pipe style (leading/trailing pipes always present in output).

### Edge Cases

| Case | Expected Behavior |
|------|------------------|
| Cell containing backticks, asterisks | Serialize as-is; do not double-escape |
| Emoji in cells | Emoji are double-width; account for display width when calculating padding |
| Very long cell (500+ chars) | Max padding cap applies; cell content is not truncated |
| Empty table (header + separator only) | Valid output: header row + separator, no data rows |
| Cell containing `\|` | Preserve as `\|` in output |

---

## Mobile & Tablet

HermesMarkdown runs on mobile and tablet. Tables are the most layout-hostile Markdown element on small screens.

### Dialog on Mobile (Phone)

- Dialog renders as a **full-screen bottom sheet** (slides up), not a centered modal
- Column/row spinners are large tap targets (minimum 44×44pt)
- The cell grid scrolls **horizontally inside the sheet** if columns overflow viewport width
- Alignment toggles collapse into a **per-column context menu** — tap the column header → popover appears with L / C / R options and a "Delete column" action
- "Add column" button is pinned to the right edge of the grid, always visible regardless of scroll position
- The software keyboard pushes the sheet upward — the active cell must remain visible above the keyboard at all times

### Dialog on Tablet

- Landscape: centered modal (same as desktop)
- Portrait: bottom sheet (same as phone)
- Split-screen multitasking on iPad: treat the editor width as the viewport — if narrow, use phone layout

### Cell Grid on Mobile

- Minimum cell tap target: 44×44pt
- Active cell expands slightly to provide a larger input area
- With 4+ columns on a phone screen, cells become too narrow to be readable — **horizontal scroll is the only option**; do not collapse, wrap, or hide columns
- Column count is not capped — the user chose to create a wide table

### Inline Table Rendering on Mobile

- Tables wider than the screen scroll horizontally **within their block only** — the rest of the document does not scroll with it
- Cell font size may be slightly reduced (0.9em or equivalent) to fit more columns on narrow screens
- On very narrow screens (< 375pt), a **card view fallback** may be offered: each row renders as a stacked key/value card instead of a horizontal row. This is opt-in / reader mode only, not the default.

### Rotation

- Rotating the device while the dialog is open: dialog reflows to the new layout, cell focus is preserved
- The grid does not reset state on rotation

### External Keyboard on iPad

- `Tab` / `Shift+Tab` cell navigation works exactly as on desktop
- All keyboard shortcuts function identically
- The alignment toggles and add/remove buttons are keyboard-accessible

---

## Accessibility

- Inline rendered tables use semantic markup: `<thead>`, `<tbody>`, `<th scope="col">` for header cells
- Sortable column headers have `aria-sort="ascending"` / `"descending"` / `"none"`
- The table dialog is `role="dialog"` with `aria-modal="true"` and an `aria-label`
- Focus is **trapped inside the dialog** while open
- `Escape` closes and cancels from anywhere in the dialog
- All dialog controls are keyboard-navigable in a logical order
- Column alignment buttons have `aria-label="Align left"` / `"Align center"` / `"Align right"`
- The "remove column" confirmation is inline — not a second dialog — and is announced to screen readers
- Very wide inline tables do not cause horizontal scroll of the entire page — only the table's scroll container scrolls

---

## Component Breakdown

| Component | Responsibility | Notes |
|-----------|---------------|-------|
| `TableDialog` | Modal / sheet shell, mode switching, insert/update action, sort state | Owns all dialog state |
| `TableGrid` | Renders the editable cell grid, passes sort info to header cells | |
| `TableCell` | Individual cell input, Tab/focus handling, sort indicator for header cells | |
| `ColumnControls` | Add/remove column buttons | Desktop: inline buttons; Mobile: context menu popover |
| `RowControls` | Add/remove row buttons | |
| `AlignmentControls` | L/C/R toggle per column | Desktop: row of buttons; Mobile: inside column context menu |
| `tableParser` | Raw Markdown table string → `TableData` struct | Pure function, no UI dependency |
| `tableSerializer` | `TableData` → Markdown table string (pretty or compact) | Pure function |
| `tableSorter` | Sort rows by column index and direction, numeric detection | Pure function |
| `tableContext` | Editor plugin: tracks cursor position within a table block | Used by auto-escape, Tab nav, Enter behavior, edit trigger |

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Merged / spanning cells | Not expressible in standard Markdown syntax |
| Row headers | GFM has no concept of row-scoped headers |
| Frozen header row on scroll | Preview/rendering enhancement — post-v1 |
| CSV / spreadsheet import | Separate feature with its own dialog and parsing concerns |
| Drag-and-drop column reordering | High complexity, low priority |
| Formulas / computed cells | Out of scope for a Markdown editor |
| Sorting outside the dialog | Post-v1; requires table cursor context to be mature |

---

## Milestones & Acceptance Criteria

### v0.2 — Core Tables

- [ ] `tableParser` handles standard GFM syntax including all edge cases documented above
- [ ] `tableSerializer` produces valid GFM output
- [ ] Inline table rendering in the editor (no preview pane)
- [ ] Tables wider than viewport scroll horizontally within their block only
- [ ] Table dialog — create mode: columns, rows, alignment, Tab navigation
- [ ] Table dialog — edit mode: pre-fills from parsed source, updates table block on confirm
- [ ] Cancel / Escape restores original source with no changes
- [ ] Removing a non-empty column or row shows a confirmation prompt
- [ ] `\|` in cells round-trips correctly through parse and serialize
- [ ] Empty table (no data rows) parses and serializes correctly

### v0.3 — Sorting & Inline Shortcuts

- [ ] Clicking a column header in the dialog cycles through asc → desc → none
- [ ] Numeric columns detected and sorted numerically
- [ ] Empty cells sort to the bottom regardless of direction
- [ ] Sort resets when a column is added or removed
- [ ] Original row order restores correctly when sort is reset
- [ ] Auto-escape `|` to `\|` when typing inside a table cell in source mode
- [ ] Tab key moves between cells in source mode (toggleable)
- [ ] Enter at end of table row inserts new row (toggleable)

### v0.4 — Serialization Polish & Mobile

- [ ] Pretty-print serialization with max padding cap
- [ ] Compact serialization option in user preferences
- [ ] Round-trip parse → serialize produces semantically identical output
- [ ] Dialog renders as bottom sheet on mobile
- [ ] Alignment controls use context menu popover on mobile
- [ ] Active cell stays above software keyboard on mobile
- [ ] Dialog reflows correctly on device rotation without losing state
- [ ] External keyboard Tab navigation works on iPad
- [ ] All accessibility requirements met (aria-sort, role, focus trap, screen reader announcements)
