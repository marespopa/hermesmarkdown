# MarkdownEditor Details

The `MarkdownEditor` is the core text editing component of HermesMarkdown. It is a highly customized wrapper around `react-simple-code-editor`.

## Key Features

- **Zen Mode**: A focused writing mode with fluid typography and centered layout.
- **Date Detection**: Automatically detects dates and provides a [DatePickerCallout](./DatePickerCallout.md) trigger.
- **Shortcodes**: Supports `{time}` and `{date}`.
- **Templates**: Non-blocking slash-command (`/`) floating menu (HIG approach) that opens right below the cursor without stealing focus from the text input. Special slash commands:
  - `/link` — opens an "Add Link" dialog to insert `[text](url)` at the cursor.
  - `/date` — opens a [DatePickerCallout](./DatePickerCallout.md) dialog to insert an ISO date (`YYYY-MM-DD`) at the cursor.
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
- **Utilities**: Date and link detection logic are moved to `app/editor/utils/`.
- **Regex**: Centralized regex definitions in `regex.ts`.
- **Cursor**: Uses `textarea-caret` for menu positioning.
