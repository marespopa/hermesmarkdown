# MarkdownEditor Details

The `MarkdownEditor` is the core text editing component of HermesMarkdown. It is a highly customized wrapper around `react-simple-code-editor`.

## Key Features

- **Zen Mode**: A focused writing mode with fluid typography and centered layout.
- **Date Detection**: Automatically detects dates and provides a [DatePickerCallout](./DatePickerCallout.md) trigger.
- **Shortcodes**: Supports `{time}`, `{date}`, and `{table}`.
- **Templates**: Non-blocking slash-command (`/`) floating menu (HIG approach) that opens right below the cursor without stealing focus from the text input. Special slash commands:
  - `/link` — opens an "Add Link" dialog to insert `[text](url)` at the cursor.
  - `/wikilink` — opens a "WikiLink" dialog to insert `[[WikiLink]]` at the cursor.
  - `/date` — opens a [DatePickerCallout](./DatePickerCallout.md) dialog to insert an ISO date (`YYYY-MM-DD`) at the cursor.
  - `/table` (or `⊞ Table` in the menu) — opens the [TableDialog](./TableDialog.tsx) in **create mode** (blank 3×3 grid).
- **Table Editing**: When the cursor is anywhere on a pipe-table line, a [TableCallout](./TableCallout.tsx) floats above the table offering: add/remove row, add/remove column, cycle column alignment, copy as CSV, and **Edit** (opens [TableDialog](./TableDialog.tsx) pre-filled from the source).
- **Table keyboard shortcuts** (cursor inside a pipe-table in source mode):
  - **Tab / Shift+Tab**: jump forward / backward between cells.
  - **`|`**: auto-escapes to `\|` to prevent accidental column splitting.
  - **Enter** at row end: appends a new empty row below.
- **Keyboard Navigation & Selection**:
  - **Arrow Keys**: Navigate the command dropdown safely without moving the main text caret.
  - **Tab or Enter**: Selects the highlighted template, clears the trigger text (e.g. `/link`), and executes the command.
- **Escape Hatches**:
  - **Spacebar Dismissal**: Pressing spacebar instantly clears the menu to keep regular prose flow.
  - **Escape Key**: Pressing ESC closes the menu keeping the text exactly as is.
  - **Passive Query Filtering**: The menu automatically fades away/closes if the typed query does not match any template.
- **Absolute Path Bypass**: Typing an absolute or relative path structure (e.g. `/Users/`, `/home/`, `/tmp/`, `./`) automatically suppresses the menu.
- **Interactive Tags**: Cycles tags like `#todo` on click.
- **Auto-Budgeting**: Real-time arithmetic evaluation.

## Implementation

- **Architecture**: Logic is encapsulated in the `useMarkdownEditor` custom hook (`app/editor/hooks/useMarkdownEditor.ts`).
- **Highlighting**: Regex-based highlighting is decoupled into `MarkdownHighlighter.tsx`.
- **Utilities**: Date, link, and table detection/manipulation logic live in `app/editor/utils/`.
- **Regex**: Centralized regex definitions in `regex.ts`.
- **Cursor**: Uses `textarea-caret` for menu and callout positioning.
