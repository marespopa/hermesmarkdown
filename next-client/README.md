# HermesMarkdown Components

This is the documentation index for the major components of HermesMarkdown.

## Core Modules

- **[Editor Components](./app/editor/components/README.md)**: The heart of the application, including the markdown editor, file sidebar, and date picker.
- **[UI Components](./app/components/README.md)**: Reusable atomic components like Buttons, Inputs, and Modals.
- **[Agent Rules](./AGENT_RULES.md)**: Mandatory guidelines and standards for AI agents working on this project.

## Key Architectures

- **State Management**: Uses [Jotai](https://jotai.org/) for atomic, distributed state. See `app/atoms/atoms.ts`.
- **File System**: Utilizes the native [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for local file management.
- **Styling**: Primarily Vanilla CSS with Tailwind utility classes for layout and responsiveness.
- **Table Support**: Pipe-table scaffold via `{table}` shortcode or `/tab` slash command; floating `TableCallout` toolbar for structural edits. Features an Apple-style **Table Dialog** for advanced tabular data entry, smart column sorting (numbers, dates, currency, text), and auto-padded markdown alignment (LCR). See [editor README](./app/editor/README.md#table-flow).
- **Typography scale**: Custom `text-ui-*` tokens in `tailwind.config.js` — from `ui-micro` (11px, status bar / ultra-dense chrome) and `ui-caption` (12px, tabs / sidebar rows) up through `ui-title-1` (28px, hero). Prefer these tokens over Tailwind's `text-xs`/`text-sm` defaults in editor chrome to keep the scale consistent. Marketing pages keep their own stylized treatment.
