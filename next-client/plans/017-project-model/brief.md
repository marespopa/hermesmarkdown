---
state: new
size: normal
kind: feature
blocked_from:
rejections: 0
created: 2026-10-22T18:16:44Z
---

# Projects: project notes, project index and a Project filter on Tasks

## Problem
HermesMarkdown already handles tasks well: vault-wide parsing (`app/utils/taskExtractor.ts`), five statuses, `@due` / `@priority` / `@started` / `@done`, a Kanban board with drag and drop, smart lists, and rollups. But every task belongs to the whole vault. A solo user running several projects (a website relaunch, a book, a client engagement) can't answer "what's left on project X?" without inventing tag conventions and filtering by hand, and there's no project-level progress.

This is phase 1 of turning HermesMarkdown into a Markdown project management tool for **one person** (no assignees, no sharing). It adds the **project model**, which later phases build on: `tasks` query blocks, a project header and dashboard, a Mermaid Gantt timeline, and project status reports. This phase only has to make projects exist, decide which tasks belong to which project, and let the Tasks page filter by project.

Follow the minimalism rule (`plans/minimalism-audit.md`): a project is just Markdown files. Nothing is stored outside the vault's notes, and the notes stay readable in any other Markdown app.

## Desired behavior

### What a project is
A project is a note whose frontmatter has `type: project`:

```yaml
---
type: project
status: active        # optional; the existing lifecycle values: draft / review / active / archived
start: 2026-11-01     # optional, YYYY-MM-DD
target: 2026-12-15    # optional, YYYY-MM-DD
---
# Website relaunch
```

- The project's **name** is the note's title, using the existing fallback order (frontmatter `title`, then the first H1, then the file name).
- `status`, `start` and `target` are optional and are only read in this phase (later phases display them). An unknown `status` value is kept as is, not rejected.
- `type` is matched case-insensitively. Other frontmatter is ignored.

### Which tasks belong to a project (user decision: support both a folder and a note)
Every task gets **at most one** project, worked out in this order (the first match wins):

1. **An explicit link on the task line.** If the task's line contains a `[[wikilink]]` that resolves to a project note, the task belongs to that project. If several do, the first one wins. This lets a task in a daily sheet or meeting note be filed under a project.
2. **The project note itself.** Tasks written inside the project note belong to it.
3. **The project's folder.** A project note that is **not at the vault root** claims the folder it sits in, including subfolders. Tasks in any note under that folder belong to the project. If folders are nested, the **nearest** project wins: a project in `Work/Relaunch/` beats one in `Work/`.
4. Otherwise the task has no project.

Edge cases the architect should settle in the PRD, with tests:
- Two project notes in the same folder. Suggested rule: neither claims the folder, each keeps only its own tasks, and a warning shows where the architect sees fit (or nowhere, if that's simpler).
- A project note at the vault root claims only itself, never the whole vault.
- Renaming or moving a project note, or removing `type: project` from it, updates which tasks belong to it the next time the index is rebuilt. Nothing is written to other notes.
- Private/sensitive notes (plan 002) follow the same rules as they do on the Tasks page today: if their tasks are hidden there now, they stay hidden.
- Tasks inside fenced code are already ignored by the extractor, and that stays the same.

### Project index
- The metadata pipeline (`app/workers/parse-note.ts` → `atom_fileMetadata` in `app/atoms/metadata.ts`) produces a **derived project index**: each project's path, name, status, start, target and its task ids, plus done/total counts.
- Each `TaskItem` (or a derived wrapper, whichever the architect prefers) carries its resolved project path. Project membership is **computed**, never written into the Markdown.
- The index updates when files change, the same way tags and tasks update today (including external edits picked up by polling).
- It must stay cheap on large vaults. Resolving membership should be roughly linear in the number of tasks, not tasks × notes. Include a benchmark or a test with a few thousand tasks if the existing bench setup (`*.bench.ts`) makes that easy.

### Project filter on the Tasks page
- The Tasks toolbar's search field (`UnifiedSearchInput`, where `#` already picks tags) gets a project picker. Suggestion: typing `+` lists projects, the same way `#` lists tags. The architect may propose a different trigger if `+` clashes with something.
- At most **one** project is picked at a time. It shows as a chip next to the tag chips and is removed the same way.
- The filter applies to every view (Board, Now, Today, Upcoming, All) and combines with search and tag filters (AND).
- The picker also offers **No project**, for tasks that haven't been filed yet.
- Archived projects (`status: archived`) are listed after active ones in the picker, or hidden behind "show archived"; the architect picks the simpler option.
- The picked project survives a reload (same storage as the other Tasks page view settings, localStorage). If the project no longer exists, the filter quietly clears.
- In the All view, group-by gets a **Project** option next to Status and Note. Tasks with no project are grouped last, under "No project".
- Task rows show no new visible chrome in this phase. A project pill on each row is a later-phase decision.

### Command palette
- **Open project…**: lists projects (with their status) in the quick switcher and opens the chosen project note.
- **Tasks: Filter by project…**: opens the Tasks page with the project picker open.
- Both are disabled with a reason when no vault is open, like the existing vault commands.
- No new keyboard shortcuts.

### Template
- Add a **Project** note template to the existing vault templates (plan 004) that fills in the frontmatter above with `status: active` and `start: {date}`, a `# {title}` heading, and empty `## Goals`, `## Tasks` and `## Notes` sections.

### Docs
- User docs: a short "Projects" section (what a project is, the membership rules with an example folder tree, the filter). Add one line to the README's "Tasks and metadata" section.
- Component docs (`*.md` next to components) are updated for anything that changes, following the existing convention.

## Out of scope
- Assignees, owners, sharing, team features (the user works solo).
- `#project/slug` nested tags as a way to file tasks (it needs nested-tag support everywhere; it may come later).
- ```` ```tasks ```` query blocks (phase 2).
- A project header on the note, a progress bar, a Project dashboard (phase 3).
- Gantt/timeline and milestones (phase 5); project status reports from rollups (phase 6).
- Dependencies between tasks, GitHub Issues sync.
- Writing anything back to notes to record membership (for example, inserting `[[Project]]` links automatically).
- New AI features.
