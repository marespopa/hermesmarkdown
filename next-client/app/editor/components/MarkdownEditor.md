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

- **State**: Uses Jotai for shared state and local React state for UI positions.
- **Highlighting**: Regex-based highlighting in `highlightMarkdown`.
- **Cursor**: Uses `textarea-caret` for menu positioning.
