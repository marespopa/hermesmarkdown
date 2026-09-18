# HermesMarkdown

HermesMarkdown is a local-first Markdown workspace that runs in the browser. It reads and writes a user-selected folder directly through the File System Access API, so your notes remain plain files on your disk. There are no accounts or required cloud uploads.

## Architecture

```mermaid
architecture-beta
    group browser(internet)[Browser]
    service workspace(server)[HermesMarkdown Workspace] in browser
    service vault(disk)[Local Markdown Vault] in browser

    group application(cloud)[Next.js Application]
    service web(server)[Next.js Web App] in application
    service ai(server)[AI API Route] in application

    service provider(internet)[AI Provider]

    workspace:R -- L:vault
    web:R -- L:workspace
    web:B -- T:ai
    ai:R -- L:provider
```

The browser hosts the workspace and accesses the selected local vault. The optional AI route is used only when an AI action is requested and configured.

See [next-client/ARCHITECTURE.md](next-client/ARCHITECTURE.md) for the detailed runtime data flow.

## Features

### Local-first workspace

- Open an existing folder or create a new vault; create, rename, move, duplicate, and delete Markdown files and folders.
- Browse files in multiple resizable editor panes with tabs, search, tags, a vault-wide Tasks page, and smart workspace views.
- Use the command palette (`Ctrl/Cmd+K` or `Ctrl/Cmd+Shift+P`) to find files, views, tasks, headings, and commands.
- External file changes are detected when the window regains focus. If both local and external edits exist, a conflict dialog lets you reload or keep local changes.
- Install the app from a supported Chromium-based browser as a PWA. Firefox and Safari can load the app, but do not provide the folder picker required for vault access.

### Markdown writing

- CodeMirror 6 source editor with Markdown syntax highlighting, Vim mode, word wrap, line numbers, frontmatter editing, and slash commands.
- Wikilinks such as `[[Note]]` and `[[Note|Alias]]`; use `Ctrl/Cmd+Click` to navigate.
- Click checkboxes to toggle tasks and click lifecycle tags to cycle their status.
- Fenced code blocks receive syntax highlighting. Mermaid fences render as diagrams with zoom and SVG download; LaTeX math renders inline.
- Optional AI chat, AI-assisted editing, and voice input with an editable preview before insertion. Configure an AI provider and key in Settings.

### Tasks and metadata

Document lifecycle tags cycle through:

`#draft` → `#review` → `#active` → `#archived`

Task tags cycle through:

`#todo` → `#prog` → `#hold` → `#done`

The Tasks page collects checkbox tasks from every note in the vault. Open it from the sidebar or command palette to search task text; filter by due date and one or more custom tags; group by status or note; and sort by due date, priority, status, note, or task text. Click a task to open its source note at that line, or toggle its checkbox to save the change directly back to Markdown.

Use `@due(YYYY-MM-DD)` for a due date and `@priority(high|med|low)` for priority. The Tasks page highlights overdue and due-today tasks, and recognizes `#prog` or `[/]` as In Progress and `#hold` as On Hold. Frontmatter status and inline lifecycle tags are kept semantically aligned. Smart views expose task, date, overdue, tag, and other indexed workspace information.

### Tables

Click inside a pipe table to open the floating table toolbar. It supports adding and removing rows or columns, cycling alignment, sorting, deleting the table, and copying the table as CSV.

Use `/table` to open the visual table editor in create mode, or use its Edit action to update an existing table. The editor provides:

- Tab, Shift+Tab, and arrow-key cell navigation.
- Left, center, or right column alignment.
- Sorting for dates, currency, percentages, numbers, and text.
- CSV/TSV paste conversion and clean, auto-padded Markdown output.

Tables remain ordinary Markdown on disk; there is no spreadsheet formula engine.

### Shortcodes and automation

Type these shortcodes in the editor:

| Shortcode | Result |
| --- | --- |
| `..d` or `{date}` | Today's date |
| `..tomorrow` / `..yesterday` | Relative date |
| `{time}` / `{datetime}` | Current time or date and time |
| `{todo}` / `{done}` | Task list item |
| `{table}` | Starter Markdown table |
| `{check}` / `{idea}` | Common symbol |
| `calc(100+50)=` | Inline arithmetic result |

On a blank line, type `/` to browse templates for tables, daily notes, meeting notes, atomic notes, essays, frontmatter, code, math, and links.

Autosave can be configured under Settings → Editor to save after a delay from 0.5 to 10 seconds, on focus changes, or manually only.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Save document | `Ctrl/Cmd+S` |
| Bold / italic | `Ctrl/Cmd+B` / `Ctrl/Cmd+I` |
| Undo | `Ctrl/Cmd+Z` |
| Toggle sidebar | `Ctrl/Cmd+Shift+E` |
| Open command palette | `Ctrl/Cmd+K` or `Ctrl/Cmd+Shift+P` |
| Open AI chat | `Ctrl/Cmd+Shift+B` |
| Start/stop voice input | `Ctrl/Cmd+Shift+V` |
| Open a link or date | `Ctrl/Cmd+Click` |
| Toggle a task checkbox | Click `[ ]` or `[x]` |
| Cycle a lifecycle tag | Click the `#tag` |

## Development

Requirements: Node.js and Yarn 4. From the repository root:

```bash
cd next-client
yarn install
yarn dev
```

The development server runs at `http://localhost:3000`. Available scripts include:

```bash
yarn build   # production build
yarn start   # serve the production build
yarn check   # TypeScript check and lint
yarn test    # Vitest test runner
```

## License and security

See [SECURITY.md](SECURITY.md) for reporting security issues.
