# Minimalism audit (2026-10-12)

**Rule:** minimal by default; advanced users get more through plain files (templates, frontmatter, `.hermes/` overrides) and the command palette, not through more chrome.

Every visible feature gets one of three answers:

- **Core**: visible by default. It earns screen space.
- **Advanced**: kept, but only reachable through the palette, a setting or a plain file. No buttons, pills or menu entries of its own.
- **Remove**: deleted, along with its code, docs and tests.

**Decision (2026-10-12): every recommendation accepted.** Removals ship first, folds next.

## 1. Writing surface

| Feature | What it is | Rec. | Why | Decision |
|---|---|---|---|---|
| Editor with live Markdown | CodeMirror, headings, lists, links rendered inline | Core | The product | |
| Tasks syntax | `[ ] [/] [!] [x] [-]`, `@due`, `@priority` | Core | Plain text, central to a worklog | |
| Task palette commands | 6 (toggle, cycle, start, hold, cancel, reset) | Advanced | Already palette-only; Mod-Enter covers most of it | |
| Format commands | 12 (bold … heading 1–6, link, code block) | Advanced | Keyboard shortcuts already exist; fine as palette-only | |
| Tables (interactive editing) | Rendered table, cell editing | Core | Plain Markdown, high value | |
| Mermaid / KaTeX | Rendered diagrams and math | Advanced | Render only when used, no chrome; keep the slash entry | |
| Callouts, folded callouts | `> [!note]` | Core | Plain Markdown | |
| Frontmatter fold + wizard | Folded YAML, slash Frontmatter | Advanced | Power-user metadata | |
| Link pill | Floating edit/open pill on links | Core | Small, contextual | |
| Workflow pill | Pill on tags like `#draft` cycling their state | **Remove** | Hidden meaning in tags, the same "magic" we removed from rollups | |
| Inline note calculator | Calculations inside notes | Advanced | Only shows when the syntax is used; check it never fires uninvited | |
| Find and replace | | Core | Expected | |
| Vim mode, invisibles, line numbers, word wrap | Settings toggles | Advanced | Already settings-only | |
| Full width | Settings toggle | Core | Layout choice | |
| Flow mode (dims all but the current paragraph) | Settings toggle | Core | It *is* the focused-writing feature; consider making it the default | |
| Hide interface while typing | On by default | Core | Already minimal | |
| Voice input + preview panel | 3 commands, draggable panel | **Remove** | Heavy, browser-dependent, rarely fits a worklog; OS dictation already exists | |

## 2. Worklog

| Feature | What it is | Rec. | Why | Decision |
|---|---|---|---|---|
| Today's sheet | Daily note from the Daily/Journal template | Core | The centre of the app | |
| `/daily` | Slash entry to open today | Core | One line of code | |
| Weekly / monthly / quarterly / yearly sheets | Plain notes from templates | Advanced | Useful to some; no chrome beyond the switcher | |
| Sheet switcher (Day · Week · Month · Quarter · Year) | Line at the top of every sheet | Advanced: **hide Quarter and Year** unless that sheet exists | Five levels on every daily sheet is noise for most users | |
| Home feed "Today · This week · …" line | Links to the levels | **Remove** | Duplicates the switcher and sidebar Today | |
| 8 This/Last week's … year's sheet commands | Palette | Advanced | Palette-only already | |
| AI Chat add to today | Approved append to today's sheet | Advanced | Behind AI and an approval | |

## 3. Navigation and workspace

| Feature | What it is | Rec. | Why | Decision |
|---|---|---|---|---|
| Command palette (search, create, commands) | Ctrl/Cmd+K | Core | The advanced-user hub | |
| Sidebar (Home, Today, Tasks, Files) | Navigation-only | Core | Reintroduced on request 10-03 | |
| Home feed: recent notes, pins, search pill | Landing view | Core | | |
| Home feed: stats line ("128 notes · 3 edited today · 5 open tasks") | | **Remove** | Dashboard noise | |
| Home feed: tag chips row | | **Remove** | Dashboard noise; tags are searchable in the palette | |
| Home feed: open tasks list | Last 7 days' open tasks | Advanced: fold by default | Useful, but the Tasks page covers it | |
| Tasks page (now / today / upcoming / all, group by) | | Core | Worklog companion | |
| Smart folders / custom workspaces | Saved metadata queries | **Remove** | A database-style feature; the palette and Tasks cover finding things | |
| Tabs | Pane tabs | Core | | |
| Split panes (right/down, focus next/prev) | | Advanced | Keep the commands; no visible split buttons | |
| Pane toolbar (Tools: palette, AI; More menu) | | Core, trimmed | After Quick jot it's palette + AI + More; fine | |
| Explorer / file tree | | Core | | |

## 4. Templates

| Feature | What it is | Rec. | Why | Decision |
|---|---|---|---|---|
| Templates folder (plain `.md`) | | Core | The extension mechanism | |
| Insert template (`/template`), New note from template | | Core | | |
| New template… (starters incl. Log entry) | | Core | | |
| Save as template… | | Advanced | Palette and slash only | |
| Template strip + field helper (`{{` menu) | Shown only in template notes | Advanced | Already contextual | |
| Empty-note template pills | Pills under an empty note | Core | Contextual, fades on typing | |
| AI Chat template skill | Writes templates for you | Advanced | Behind AI | |

## 5. AI

| Feature | What it is | Rec. | Why | Decision |
|---|---|---|---|---|
| AI Chat (tools, skills `/review`, `/tasks`) | Panel, Ctrl/Cmd+Shift+B | Advanced | Off until a key is set; keep as is | |
| 14 AI actions in the slash menu and palette | Improve, fix, shorten, expand, 4 tones, summarize, extract tasks, outline, title, continue, explain | Advanced: **one `/ai` entry** that opens a picker | 14 slash rows crowd the menu | |
| Generate new note with AI | Another way into AI | **Remove** | Duplicates AI Chat. ("Open AI Chat", id `ai-builder`, is AI Chat itself and stays.) | |
| Repurpose wizard (blog, social, newsletter) | Three-step wizard | **Remove** | Off-mission for a worklog | |
| Token cost dialog | Cost of sending the note to models | Advanced | Palette only (already in More: move out) | |
| AI provider commands (Claude, Gemini) | | Advanced | Settings already has it; drop the two palette commands | |

## 6. Vault and storage

| Feature | What it is | Rec. | Why | Decision |
|---|---|---|---|---|
| Local folder vault (File System Access) | | Core | | |
| Browser vaults (OPFS) + 7 commands | Rename, delete, export zip/folder, import | Advanced | Needed where FSA isn't available; palette-only | |
| GitHub vault (commit, push, pull, sync) | | Advanced | Power users; palette-only | |
| Import file / files / folder | | Advanced | | |
| Export as PDF… | | Core (palette + More) | | |
| Show hidden files | | Advanced | | |

## 7. Privacy

| Feature | What it is | Rec. | Why | Decision |
|---|---|---|---|---|
| Sensitive / private notes (frontmatter + slash) | | Advanced | Plain-file flag; keep the 3 slash entries in one `/privacy` entry | |
| Privacy mode (title only / blurred / hidden) | Settings → Privacy | Advanced: **two levels** (off, hidden) | Three levels is more than most need | |
| Show/hide sensitive notes this session | | Advanced | | |

## 8. Settings (7 sections)

| Section | Rec. | Why | Decision |
|---|---|---|---|
| Appearance (theme, sidebar, font, size) | Core | | |
| Editor (layout, writing modes) | Core | | |
| Files (folders, hidden files, autosave) | Core | Autosave mode/delay could be Advanced (sensible default) | |
| Templates folder (inside Files) | Core | | |
| AI | Advanced | Only matters with a key | |
| Privacy | Advanced | | |
| Profile (name, stored data, command history) | Merge into Guide/About | A whole section for a name | |
| Guide (tour, shortcuts, docs, version) | Core | | |

## 9. Onboarding and help

| Feature | What it is | Rec. | Why | Decision |
|---|---|---|---|---|
| Welcome wizard (7 steps) | Name, vault, look, layout, writing, autosave … | **Shorten to 2 steps** (vault, then write) | Every choice in it has a sensible default and a setting | |
| Documentation, keyboard shortcuts overlay | | Core | | |

## 10. Outside the editor

| Feature | What it is | Rec. | Why | Decision |
|---|---|---|---|---|
| Landing page, `/what-is-hermes-md`, `/markdown-editor` | Marketing | Keep | Not in the app | |
| Free tools (cleaner, Mermaid, table, token cost, tokenizer) + SEO pages | `/tools/*` | Keep, but **remove "Open Free Tools" from the app's More menu and palette** | Marketing surface, not part of writing | |

## If every recommendation is accepted

- **Removed:** workflow pill, voice input, Repurpose wizard, Generate note with AI, smart folders, home feed stats / tags / sheet links, AI provider palette commands, "Open Free Tools" in the app.
- **Folded:** 14 AI slash rows into `/ai`; 3 privacy slash rows into `/privacy`; Profile into Guide; privacy mode to two levels; the switcher hides Quarter/Year until used; the wizard goes to 2 steps.
- **Rough effect:** the palette drops by about 25 commands and the slash menu from 33 to about 16 entries. The home feed becomes notes, pins and search.

Ship it in two releases, removals first (each is mostly deletion), then the folds.

## Status

- **Removals: done (2026-10-12, release 6.13.0).** Workflow pill, voice input, Repurpose wizard, Generate new note with AI, smart folders, home feed stats line, tag chips and sheet links, AI provider palette commands, Free Tools in the editor's palette and More menu. The open-tasks list kept its fold: it moved from the stats line to its own "N open tasks" toggle.
- **Folds: next.** `/ai`, `/privacy`, Profile into Guide, two privacy levels, switcher hiding Quarter/Year, a 2-step wizard, the open-tasks list folded by default, Token Cost out of the More menu.
