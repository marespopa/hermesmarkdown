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

    service github(server)[GitHub API Routes] in application

    service provider(internet)[AI Provider]
    service gh(internet)[GitHub]

    workspace:R -- L:vault
    web:R -- L:workspace
    web:B -- T:ai
    ai:R -- L:provider
    web:T -- B:github
    github:R -- L:gh
```

The browser hosts the workspace and accesses the selected local vault. The optional AI route is used only when an AI action is requested and configured. The optional GitHub routes are used only for GitHub-backed vaults (OAuth, import, commit, pull).

See [next-client/ARCHITECTURE.md](next-client/ARCHITECTURE.md) for the detailed runtime data flow.

## Features

### Local-first workspace

- Open an existing folder or create a new vault; create, rename, move, duplicate, and delete Markdown files and folders.
- Browse files in multiple editor panes with tabs, a dedicated Explorer view (`Ctrl/Cmd+Shift+E`), and a vault-wide Tasks page. On phones, the file overlay also offers Smart Workspaces (saved rule-based filters).
- Use the command-first quick switcher (`Ctrl/Cmd+K` or `Ctrl/Cmd+P`) to find files by name, and its prefixes to search tags (`#`), commands (`>`), tasks (`!`), and headings in the current note (`@`). Pin up to five items with `Ctrl/Cmd+D`.
- External file changes are detected by polling (and immediately when the window regains focus). If both local and external edits exist, a conflict dialog lets you accept the incoming version, keep yours, or resolve them in a merge editor.
- Optionally connect a GitHub repository as a vault: Markdown files are imported into the browser, and the command palette's `GitHub: Commit / Push / Sync / Pull` commands write commits straight to the default branch.
- Works in every modern browser. Chromium-based browsers open folders on disk; Safari (including iPhone and iPad), Firefox, and other browsers use **browser vaults** stored privately in the browser. Export any vault as a zip, or import a zip, folder, or notes into it, so notes never get stuck in one place.
- Install it as an app (PWA) from any browser that supports installation. The installed app starts offline.

### Markdown writing

- CodeMirror 6 source editor with Markdown syntax highlighting, Vim mode, word wrap, line numbers, foldable frontmatter, and slash commands.
- Wikilinks such as `[[Note]]` and `[[Note|Alias]]`; type `[[` to pick a note and `Ctrl/Cmd+Click` to navigate.
- Click checkboxes to toggle tasks and click lifecycle tags to cycle their status. Dates and `@priority` annotations render as pills.
- Fenced code blocks receive syntax highlighting. Mermaid diagrams and display math (`$$ … $$` or a ```` ```math ```` fence, rendered with KaTeX) are shown rendered in the editor. Double-click one, or press `Ctrl/Cmd+Shift+Enter` beside it, to edit its source with a live preview. Mermaid diagrams can also open in a viewer with zoom and SVG download.
- Inline calculator: write `rent = 1200`, `utilities = 180`, then `rent + utilities`, and a faint `= 1380` appears at the end of the line. It supports named values, `450 + 15%` and `15% of 200`. Results are only displayed, and the file keeps just what you typed.
- Optional flow mode (Settings → Editor or the command palette): fades everything but the paragraph you are writing and keeps the current line centered on screen.
- Paste or drop images; they are saved to the vault's `assets/` folder and linked.
- Optional AI (bring your own Anthropic or Gemini key): AI Chat (`Ctrl/Cmd+Shift+B`, or the Ask AI pill on a selection) with `@note` / `@vault` references, attachments and follow-ups; one-click rewrite actions with a diff review; note generation; and repurposing a note into blog/social/newsletter drafts.
- Voice input with an editable preview before insertion (Chromium browsers).

### Tasks and metadata

Document lifecycle tags cycle through:

`#draft` → `#review` → `#active` → `#archived`

Task tags cycle through:

`#todo` → `#prog` → `#hold` → `#done`

The Tasks page collects checkbox tasks from every note in the vault. Open it from the command palette (Open Tasks) to search task text; filter by due date and one or more custom tags; group by status or note; and sort by due date, priority, status, note, or task text. Click a task to open its source note at that line, or toggle its checkbox to save the change directly back to Markdown.

Use `@due(YYYY-MM-DD)` for a due date and `@priority(high|med|low)` for priority. The Tasks page highlights overdue and due-today tasks, and recognizes `#prog` or `[/]` as In Progress and `#hold` as On Hold. `Ctrl/Cmd+Enter` cycles the status of the task on the current line.

### Tables

Pipe tables render as an editable grid: click a cell and type, like a spreadsheet. The file on disk stays a plain Markdown pipe table.

- `Tab` / `Shift+Tab`, `Enter` and the arrow keys move between cells; tabbing or pressing `Enter` past the last row adds one.
- Column letters and row numbers appear while editing; click them (or right-click a cell) for row, column and table actions: insert, move, delete, align, sort (dates, currency, numbers, text), sum a column, and copy as CSV or JSON.
- Keyboard: `Ctrl/Cmd+Enter` inserts a row, `Ctrl/Cmd+Shift+Backspace` deletes it, `Alt+↑/↓` moves a row, `Ctrl/Cmd+Alt+←/→` moves a column.
- Paste a spreadsheet range or CSV/TSV into a cell to fill cells, adding rows and columns as needed.
- Formulas: start a cell with `=` — for example `=SUM(B2:B5)`, `=AVERAGE(B2:D2)`, `=IF(B2>0, "yes", "no")`. Supported functions: SUM, AVERAGE, COUNT, COUNTA, MIN, MAX, ROUND, ABS, IF, AND, OR, NOT, CONCAT. Reference another table in the note by its heading (`=SUM(Income!B)`) or another note (`=[[Budget]]!B5`). Amounts such as `$2,000` or `1000 RON` count as numbers.

Formulas are stored as text (`| =SUM(B2:B5) |`), so other Markdown apps show the formula rather than the result.

### Shortcodes and automation

Type these shortcodes in the editor:

| Shortcode | Result |
| --- | --- |
| `..d` or `{date}` | Today's date |
| `..tomorrow` / `..yesterday` | Relative date |
| `{time}` / `{datetime}` | Current time or date and time |
| `{todo}` / `{done}` | Task list item |
| `{table}` | Starter Markdown table |
| `{iso}` / `{unix}` / `{day}` / `{week}` | Timestamp formats |
| `..log` | Time-stamped log prefix |
| `{check}` / `{idea}` / `{warn}` / `{bug}` … | Common symbol |
| `calc(100+50)=` | Replaced with the arithmetic result |

For results that stay beside your working, write the math on its own line instead (see the inline calculator under Markdown writing).

At the start of a line or after a space, type `/` to insert a link, wikilink, date, task, table, code block, Mermaid diagram, callout, collapsible callout, or frontmatter — plus AI actions when AI is configured.

Autosave can be configured under Settings → Autosave to save after a delay from 0.5 to 10 seconds, on focus changes, or manually only.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Save document | `Ctrl/Cmd+S` |
| Bold / italic | `Ctrl/Cmd+B` / `Ctrl/Cmd+I` |
| Strikethrough / inline code | `Ctrl/Cmd+Shift+X` / `Ctrl/Cmd+E` |
| Undo / redo | `Ctrl/Cmd+Z` / `Ctrl+Y` (`Cmd+Shift+Z`) |
| Indent / outdent list item | `Tab` / `Shift+Tab` |
| Cycle task status | `Ctrl/Cmd+Enter` |
| Open helper at cursor (link, date, diagram/math source, image) | `Ctrl/Cmd+Shift+Enter` |
| Open Explorer | `Ctrl/Cmd+Shift+E` (or `Ctrl/Cmd+B` outside the editor) |
| New file / close tab | `Ctrl+Alt+N` / `Ctrl/Cmd+Alt+W` |
| Select workspace tab | `Ctrl/Cmd+1`–`9` |
| Open quick switcher | `Ctrl/Cmd+K` or `Ctrl/Cmd+P` |
| Open command palette | `Ctrl/Cmd+Shift+K` or `Ctrl/Cmd+Shift+P` |
| Search files | `Ctrl/Cmd+Shift+F` |
| Open AI chat | `Ctrl/Cmd+Shift+B` |
| Start/stop voice input | `Ctrl/Cmd+Shift+V` |
| Open a link or date | `Ctrl/Cmd+Click` |
| Toggle a task checkbox | Click `[ ]` or `[x]` |
| Cycle a lifecycle tag | Click the `#tag` |

## Development

Requirements: Node.js 22 and Yarn 4 (via Corepack). From the repository root:

```bash
cd next-client
corepack enable
yarn install
yarn dev
```

The development server runs at `http://localhost:3000`. Available scripts include:

```bash
yarn build   # production build
yarn start   # serve the production build
yarn check   # TypeScript check and lint
yarn test    # Vitest (watch mode; add --run for a single pass)
```

### Factory

Feature work can run through an agent pipeline. Each stage is a headless Claude Code session using the `hermes-architect`, `hermes-engineer` and `hermes-review` agents in `.claude/agents/`.

```bash
scripts/factory new tag-autocomplete "Tag autocomplete"   # then fill in brief.md
scripts/factory run 007            # dry run: shows the next stage
scripts/factory run 007 --commit   # runs it: new → specced → review → approved
scripts/factory list
```

Agents never commit. A hook blocks git writes during a stage, and the script blocks the plan if HEAD moves. You review, commit and merge the approved change yourself. The folder contract, states and unblock flow are in [`next-client/plans/README.md`](next-client/plans/README.md).

## License and security

See [SECURITY.md](SECURITY.md) for reporting security issues.
