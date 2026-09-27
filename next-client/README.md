# HermesMarkdown Components

This is the documentation index for the major components of HermesMarkdown.

## Core Modules

- **[Editor](./app/editor/README.md)**: Editor data flow, tables and formulas, tasks page, and editor utilities.
- **[Editor Components](./app/editor/components/README.md)**: The markdown editor, file tree, dialogs, and pane/tab components.
- **[UI Components](./app/components/README.md)**: Reusable atomic components like Buttons, Inputs, and Modals.
- **[Atoms](./app/atoms/README.md)**, **[Hooks](./app/hooks/README.md)**, **[Services](./app/services/README.md)**: State, file-system hooks, and AI / GitHub / IndexedDB services.
- **[Architecture](./ARCHITECTURE.md)** and **[Design system](./DESIGN.md)**: Runtime data flow and design tokens.
- **[CI/CD](../docs/ci-cd.md)**: Verification, release, deploy, and rollback workflows.
- **[Agent Rules](./AGENT_RULES.md)**: Mandatory guidelines and standards for AI agents working on this project.

## Key Architectures

- **State Management**: Uses [Jotai](https://jotai.org/) for atomic, distributed state. See `app/atoms/atoms.ts`.
- **File System**: Utilizes the native [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) for local file management.
- **Styling**: Tailwind utility classes backed by CSS-variable design tokens (`app/globals.scss`, `tailwind.config.js`); editor-specific styles live in `app/editor/editor.scss`.
- **Editor Engine**: Current source-mode editor runs on CodeMirror 6; slash commands, wiki links, tables, and Mermaid helpers all live under `app/editor/codemirror` and `app/editor/hooks`.
- **Mermaid Support**: Fenced Mermaid blocks show a trigger button (or `Ctrl/Cmd+Shift+Enter`) that opens the dedicated Mermaid dialog viewer; diagrams are not rendered inline.
- **Table Support**: Pipe tables render as an in-place editable grid (`codemirror/table-display.tsx`) with spreadsheet-style row/column rulers and context menus (`table-handles.ts`), structural commands (`table-commands.ts`), smart sorting, and a formula engine (`utils/formula-engine.ts`, `codemirror/table-formulas.ts`) including cross-table and cross-note references. Insert with `/table` or the `{table}` shortcode. See [editor README](./app/editor/README.md#table-flow).
- **GitHub Vaults**: Optional repository-backed vaults stored in the browser's Origin Private File System, synced through the server routes in `app/api/github/` and `app/services/github-*.ts`.
- **AI**: Bring-your-own-key Anthropic / Gemini requests proxied through `app/api/ai/route.ts`; client helpers in `app/services/ai.ts`.
- **Tasks**: The vault-wide Tasks page derives checkbox tasks from indexed Markdown, supports filtering, grouping, and sorting, and writes checkbox changes back through the normal file-save flow. See [editor README](./app/editor/README.md#tasks-page).
- **Typography scale**: Custom `text-ui-*` tokens in `tailwind.config.js` — from `ui-micro` (11px, status bar / ultra-dense chrome) and `ui-caption` (12px, tabs / file-tree rows) up through `ui-title-1` (28px, hero). Prefer these tokens over Tailwind's `text-xs`/`text-sm` defaults in editor chrome to keep the scale consistent. Marketing pages keep their own stylized treatment.
