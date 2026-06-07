# 🏛️ Hermes Markdown

Hermes Markdown is a professional, local-first workspace built for markdown editing. No cloud, no tracking, no friction—just a clean canvas for your thoughts. It turns any local directory into a powerful writing vault using modern web standards.

## 🚀 Key Features

### 01. Knowledge Management
*   **Local-First Vaults:** Open any local directory on your machine to browse files, manage folders, and save changes instantly. No proprietary lock-in. *(Note: We recommend pausing cloud sync like Dropbox or iCloud during active sessions to avoid file locking).*
*   **Internal Connectivity:** Link your thoughts dynamically using `[[WikiLink]]` and `[[Name|Aliased Link]]` syntax. Navigation is as simple as `CTRL + Click`.
*   **Smart Workspaces:** Filter your notes in real time by tag, name, date, or word count using a built-in Query Builder. Features a native **Today's Work** workspace for files edited in the last 24 hours.
*   **Multi-Pane Editing:** Work on several files side-by-side by splitting your layout into multiple editor panes with custom resizing.

### 02. Frictionless Writing Experience
*   **Zen Mode:** Eliminate distractions with a clean `~85` character layout width, hidden sidebars, and an active line focus tint (`CTRL + SHIFT + Z`).
*   **Live Click Actions:** Interact directly with elements inside the editor. Toggle tasks (`- [ ]` to `- [x]`), cycle lifecycle tags, or open calendar popups simply by clicking them.
*   **Advanced Table Editor:** Place your cursor inside any pipe table to reveal a floating toolbar or open the Advanced Table Dialog for auto-padded alignment, smart data sorting (dates, currency, numbers), and CSV exporting.

### 03. Shortcuts & Automation
*   **Interactive Status Lifecycles:** Track work stages instantly. Clicking any of these smart tags automatically cycles it to the next phase:
    `#urgn` (Urgent) → `#todo` (To-Do) → `#prog` (Progress) → `#wait` (Waiting) → `#done` (Done)
*   **Financial Intelligence & Inline Math:** 
    *   Automatically sums up currency listings directly above a line starting with `Total:` (e.g., sums up `- Rent: $2000` and `- Food: $400` into `Total: $2400.00`).
    *   Evaluates inline equations instantly using `calc(100+50)=` syntax.
*   **Flexible Auto-Save:** Configure the workspace to auto-save after a customized delay (0.5s – 10s), on focus changes, or stick to traditional manual saving (`CTRL + S`).

---

## ⌨️ Shortcodes & Templates Reference

### Date & Utility Shortcodes
Type these anywhere in the editor to instantly inject text or structural elements:

| Shortcode | Result |
| :--- | :--- |
| `..d` or `{date}` | Today's Date (supports ISO, slashed, and dotted formats) |
| `..tomorrow` | Tomorrow's Date |
| `..yesterday` | Yesterday's Date |
| `{time}` | Current Time |
| `{datetime}` | Current Date + Time |
| `{todo}` | `- [ ] ` Task List Item |
| `{done}` | `- [x] ` Completed Task Item |
| `{table}` | Insert a starter 3×2 table |
| `{check}` | ✅ |
| `{idea}` | 💡 |

### The Slash `/` Menu
Type `/` on a blank line to bring up an autocomplete template selector. Use your arrow keys and press `Enter` to instantly generate standardized outlines:
*   `⊞ Table` — Pre-formatted 3x2 grid with auto-focused header cells.
*   `🗓️ Daily Note` — Structured journal entry frame.
*   `📋 Meeting Notes` — Agenda and action-item outline.
*   `🧠 Atomic Note` — Standard template for standalone, linked ideas.
*   `✍️ Essay` — Structured skeleton for long-form prose.
*   `📄 Frontmatter` — Standardized YAML configuration block.

---

## ⌨️ Primary Keyboard Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Save Document** | `CTRL + S` |
| **Bold Text** | `CTRL + B` |
| **Italic Text** | `CTRL + I` |
| **Toggle Zen Mode** | `CTRL + SHIFT + Z` |
| **Follow WikiLink** | `CTRL + Click` on link |
