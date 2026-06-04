# MarkdownEditor Details

The `MarkdownEditor` is the core text editing component of HermesMarkdown. It is a highly customized wrapper around `react-simple-code-editor`.

## Key Features

- **Zen Mode**: A focused writing mode with fluid typography and centered layout.
- **Date Detection**: Automatically detects dates and provides a [DatePickerCallout](./DatePickerCallout.md) trigger.
- **Shortcodes**: Supports `{time}` and `{date}`.
- **Templates**: Slash-command (`/`) for inserting templates.
- **Interactive Tags**: Cycles tags like `#todo` on click.
- **Auto-Budgeting**: Real-time arithmetic evaluation.

## Implementation

- **Architecture**: Logic is encapsulated in the `useMarkdownEditor` custom hook (`app/editor/hooks/useMarkdownEditor.ts`).
- **Highlighting**: Regex-based highlighting is decoupled into `MarkdownHighlighter.tsx`.
- **Utilities**: Date and link detection logic are moved to `app/editor/utils/`.
- **Regex**: Centralized regex definitions in `regex.ts`.
- **Cursor**: Uses `textarea-caret` for menu positioning.
