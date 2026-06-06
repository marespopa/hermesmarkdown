# Plan: Markdown Table Support — HermesMarkdown

## Context

HermesMarkdown uses `react-simple-code-editor` (textarea + `<pre>` overlay), not ProseMirror/CodeMirror. All cursor-context detection is done with regex against the raw text buffer, and floating UI is positioned with the `textarea-caret` library. The link pill (`use-link-pill.ts` + `LinkPill.tsx`) is the exact pattern to replicate for the table callout. Templates live in `constants.ts`; the slash menu filters `TEMPLATES[]` and calls `insertTemplate()`; shortcodes are a `Record<string, () => string>` map expanded on each keystroke in `useMarkdownEditor.ts`.

The "preview/render mode" for CSS table styling is a **placeholder** pane in `PaneLeaf.tsx` that shows nothing yet — full HTML table CSS will be written but won't be visible until a preview component using `react-markdown` is implemented. Editor-layer table syntax highlighting is the visible win for this iteration.

---

## Scaffold String (used in both slash menu and shortcode)

```
| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell     | Cell     | Cell     |
| Cell     | Cell     | Cell     |
```

For the slash menu, a `\0` null-byte cursor sentinel is embedded before `Header 1` — removed before insertion, cursor placed at its position (inside first cell).

---

## Implementation Steps

### 1 — `constants.ts`: Register shortcode + template

**File:** `app/editor/components/constants.ts`

- Add export: `export const CURSOR_SENTINEL = "\0";`
- Add to `SHORTCODES` map:
  ```ts
  "{table}": () =>
    "| Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n| Cell     | Cell     | Cell     |",
  ```
  (No cursor sentinel in shortcode — cursor goes to end of inserted text, which is acceptable.)
- Add to `TEMPLATES` array (near top, after the link/date entries):
  ```ts
  { label: "⊞ Table", content: "| \0Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n| Cell     | Cell     | Cell     |" },
  ```

---

### 2 — `use-editor-templates.ts`: Handle cursor sentinel

**File:** `app/editor/hooks/use-editor-templates.ts`

In `insertTemplate`, after shortcode substitution and before `setSelectionRange`, detect the sentinel:

```ts
import { CURSOR_SENTINEL } from "../components/constants";

const sentinelIdx = processedContent.indexOf(CURSOR_SENTINEL);
const cleanContent = processedContent.replace(CURSOR_SENTINEL, "");
const fullNewValue = before + cleanContent + after;
// ... budget calc unchanged, uses cleanContent instead of processedContent ...

let newPos = sentinelIdx !== -1
  ? before.length + sentinelIdx
  : before.length + cleanContent.length;
```

Replace usages of `processedContent` in lines 103–134 with `cleanContent`. The sentinel-aware `newPos` is passed to `setSelectionRange`.

---

### 3 — `app/editor/utils/table-detection.ts` (new file)

Exports `findTableAtPos(text: string, pos: number)`.

Logic:
1. Walk the text to find `lineIdx` (the line the cursor is on) and `lineStartOffset`.
2. `isTableLine(line)` — true if the trimmed line starts with `|` and contains at least one more `|`.
3. Walk up from `lineIdx` to find `tableStart`; walk down to find `tableEnd`.
4. Count `|` separators before the cursor position within the current line to determine `cursorCol` (0-based data column index).
5. Compute `tableStartOffset` (char index of table's first character in the full text).
6. Return `{ tableStart, tableEnd, lineIdx, cursorRow, cursorCol, tableStartOffset, lines: string[] }` or `null` if the current line is not a table line.

---

### 4 — `app/editor/utils/table-manipulation.ts` (new file)

All functions take `lines: string[]` (full document lines) and return modified `lines: string[]`. The caller reconstructs the document with `lines.join('\n')`.

| Function | Behavior |
|----------|----------|
| `addRow(lines, tableEnd)` | Append a new data row (matching column count of last row) after `tableEnd` |
| `addColumn(lines, tableStart, tableEnd)` | For each row in range: separator rows get ` -------- `, others get ` ` (empty cell) |
| `removeRow(lines, lineIdx, tableStart)` | No-op if `lineIdx` is header (`tableStart`) or separator (`tableStart+1`); otherwise splice that line |
| `removeColumn(lines, colIdx, tableStart, tableEnd)` | Parse each row's cells, remove cell at `colIdx`, reserialize |
| `cycleAlignment(lines, colIdx, tableStart)` | Cycle separator row's column at `colIdx`: `--------` → `:-------` → `:------:` → `-------:` → `--------` |
| `tableToCSV(lines, tableStart, tableEnd)` | Parse non-separator rows, join cells with `,` (quoting cells containing commas), rows with `\n` |

Internal helpers: `parseRow(line: string): string[]` (split on `|`, trim, drop empty boundary strings); `serializeRow(cells: string[]): string` (join with ` | `, wrap in outer `|`).

---

### 5 — `app/editor/hooks/use-table-callout.ts` (new file)

Exact parallel of `use-link-pill.ts`.

**State:**
```ts
const [tableInfo, setTableInfo] = useState<ReturnType<typeof findTableAtPos>>(null);
const [calloutPos, setCalloutPos] = useState({ top: 0, left: 0 });
const suppressRef = useRef(false);
```

- **Suppress on value change** (50 ms debounce, identical to link pill): clear `tableInfo`.
- **`detectTableAtCaret`** (called on `selectionchange`):
  1. Skip if suppressed, textarea not focused, or selection not collapsed.
  2. Call `findTableAtPos(value, textarea.selectionStart)`.
  3. If null → `setTableInfo(null)`.
  4. If found → `getCaretCoordinates(textarea, result.tableStartOffset)` for position. Place callout **above** the table: `top: caret.top - 36`, `left: caret.left`, clamped to `textarea.clientWidth - CALLOUT_WIDTH`.
  5. `setTableInfo(result)` and `setCalloutPos(...)`.

**Returned `handle*` functions** (one per button): call the manipulation utility, then `onChange(newLines.join('\n'))`, then `textareaRef.current?.focus()`.

**Returns:** `{ tableInfo, setTableInfo, calloutPos, handleAddRow, handleAddCol, handleRemoveRow, handleRemoveCol, handleCycleAlign, handleCopyCSV }`.

---

### 6 — `app/editor/components/TableCallout.tsx` (new file)

Parallel of `LinkPill.tsx`.

```tsx
interface TableCalloutProps {
  pos: { top: number; left: number };
  currentAlignment: "left" | "center" | "right" | "none";
  onAddRow: () => void;
  onAddCol: () => void;
  onRemoveRow: () => void;
  onRemoveCol: () => void;
  onCycleAlign: () => void;
  onCopyCSV: () => void;
}
```

Renders a `<div>` with `PILL_CONTAINER_CLASSES`, `style={{ top: pos.top, left: pos.left }}`, and `onMouseDown={(e) => e.preventDefault()}`. Contains 6 `<Button variant="pill-icon">` elements: `+ Row`, `+ Col`, `× Row`, `× Col`, alignment label (`L` / `C` / `R` / `—`), `CSV`.

---

### 7 — Wire into `useMarkdownEditor.ts`

Import `useTableCallout`; call it with `{ value, onChange, textareaRef }`. Spread all returned values into the hook's return object.

---

### 8 — Render in `MarkdownEditor.tsx`

After the `{pillUrl && <LinkPill .../>}` block:

```tsx
{tableInfo && (
  <TableCallout
    pos={calloutPos}
    currentAlignment={currentAlignment}
    onAddRow={handleAddRow}
    onAddCol={handleAddCol}
    onRemoveRow={handleRemoveRow}
    onRemoveCol={handleRemoveCol}
    onCycleAlign={handleCycleAlign}
    onCopyCSV={handleCopyCSV}
  />
)}
```

Dismissal on blur: add `setTableInfo(null)` to the existing `onBlur` callback (the 150 ms timeout block that already clears `pillUrl` and `dateMatch`).

---

### 9 — `MarkdownHighlighter.tsx`: Table line syntax highlighting

In `highlightMarkdown()`, add a branch before the final `else` fallback for lines that are part of a pipe table:

```ts
} else if (/^\s*\|/.test(html)) {
  const isSeparator = /^\s*\|[\s:|-]+\|/.test(html);
  if (isSeparator) {
    content = `<span ${FADED}>${html}</span>`;
  } else {
    content = html.replace(/\|/g, `<span ${FADED}>|</span>`);
    content = processInlineMarkdown(content, dateMatch, activeLink);
  }
}
```

---

### 10 — CSS: Table rendering styles

**File:** `app/globals.scss`

Scoped to `.hermes-preview` for the future preview pane. Activates when a preview component wraps rendered markdown in that class:

```scss
// Table rendering (preview pane + PDF export)
.hermes-preview table {
  width: 100%;
  border-collapse: collapse;
  overflow-x: auto;
  display: block;
}
.hermes-preview table th,
.hermes-preview table td {
  border: 1px solid theme('colors.zinc.200');
  padding: 0.4rem 0.75rem;
  text-align: left;
}
.hermes-preview table tr:nth-child(even) {
  background-color: theme('colors.zinc.50');
}
html.dark .hermes-preview table tr:nth-child(even) {
  background-color: theme('colors.zinc.900');
}
html.dark .hermes-preview table th,
html.dark .hermes-preview table td {
  border-color: theme('colors.zinc.700');
}
```

---

## Critical Files Summary

| File | Status | Key change |
|------|--------|------------|
| `app/editor/components/constants.ts` | modify | `CURSOR_SENTINEL`, `{table}` shortcode, `⊞ Table` template |
| `app/editor/hooks/use-editor-templates.ts` | modify | Sentinel-aware cursor placement in `insertTemplate` |
| `app/editor/utils/table-detection.ts` | **create** | `findTableAtPos` |
| `app/editor/utils/table-manipulation.ts` | **create** | `addRow`, `addColumn`, `removeRow`, `removeColumn`, `cycleAlignment`, `tableToCSV` |
| `app/editor/hooks/use-table-callout.ts` | **create** | Detection hook (mirrors `use-link-pill.ts`) |
| `app/editor/components/TableCallout.tsx` | **create** | Floating callout UI (mirrors `LinkPill.tsx`) |
| `app/editor/hooks/useMarkdownEditor.ts` | modify | Wire `useTableCallout`, expose state |
| `app/editor/components/MarkdownEditor.tsx` | modify | Render `<TableCallout>`, dismiss on blur |
| `app/editor/components/MarkdownHighlighter.tsx` | modify | Table line syntax highlighting |
| `app/globals.scss` | modify | `.hermes-preview table` CSS |

---

## Reused Utilities

- `getCaretCoordinates` from `textarea-caret` — positioning (same as link pill and date pill)
- `PILL_CONTAINER_CLASSES` from `constants.ts` — callout container styling
- `Button` with `variant="pill-icon"` — all action buttons in the callout
- `suppressRef` / 50 ms debounce pattern — from `use-link-pill.ts`

---

## Verification

1. Type `/tab` → `⊞ Table` appears in slash menu → select → scaffold inserts with cursor inside `Header 1`
2. Type `{table}` → scaffold expands inline; cursor at end
3. Place cursor on any table line → floating callout appears above the table
4. `+ Row` → new row appended to markdown source
5. `+ Col` → new column added to every row including separator
6. `× Row` on a data row → row removed; on header/separator → no-op
7. `× Col` → column at cursor index removed from all rows
8. Alignment button (repeated) → separator cell cycles `--------` → `:-------` → `:------:` → `-------:`
9. `CSV` → paste into text editor verifies valid comma-separated output
10. Move cursor out of table → callout dismisses
11. Click outside editor → callout dismisses
12. Pipe characters render faded; separator rows render fully faded in the editor overlay
