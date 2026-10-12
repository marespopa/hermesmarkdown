# Templates first: drop the worklog, add template packs

Single plan, built directly (no factory). Replaces `worklog-funnel.md`.

## Decision (2026-10-12)

Keep the app as plain as iA Writer: notes, folders, templates. The app no longer has a daily or periodic worklog of its own. A dated note is just what a template makes.

- **Template packs are vault folders.** A pack is a subfolder of the templates folder (`templates/Journal/Daily.md`). Loose templates (`templates/Meeting.md`) still work. Packs are plain files: they sync, diff and travel with the vault.
- **Built-in packs** ship with the app (Journal, Meetings, Writing, Projects). **Add to vault** copies one into `templates/<Pack>/` as editable files, and never overwrites a file that's already there.
- **Dated notes come from template routing.** A template with `file_name` names its note. Using it opens that note when it already exists, otherwise it creates the note. The Journal pack's Daily template (`file_name: {{date}}`, `target_folder: journal/{{year}}`) replaces Today's sheet. Weekly/Monthly/Yearly work the same way with `{{weekSheet}}` / `{{monthSheet}}` / `{{yearSheet}}`.
- **One Templates page** (`/editor/templates`) to browse, use, edit, add and manage packs.

## Removed

- Today's sheet:
  - Sidebar **Today** and the feed's "Today" / "Start today's sheet" row.
  - The feed's `t` key.
  - The **Today's sheet** command and `/daily`.
  - The `hermes:open-today-sheet` event.
  - `openTodayNote` / `ensureTodayNote` / `resolveSheetFolder`.
  - `utils/today-note.ts`.
- **Daily Sheets Folder** setting (`atom_todayFolder`, `hermes_today_folder`). The stored value is ignored.
- Periodic sheets:
  - `use-period-sheets`, `use-period-sheet-commands` and the eight This/Last week/month/quarter/year commands.
  - `matchPeriodTemplate`.
  - The `{{period}}`, `{{periodHeading}}`, `{{previousPeriod}}` and `{{nextPeriod}}` tokens. In old templates they're now plain blanks.
- The sheet switcher (`SheetSwitcher`, `SheetSkeleton`, `use-sheet-navigation`, `utils/sheet-nav`) and the tab sheet-level classes.
- AI Chat:
  - The `add_to_today` tool (`use-today-append`, `utils/today-append`, the approval card).
  - The weekly review skill (`/review`, `use-daily-sheets`, `utils/periods/daily-sheets`, `weekDataBlock`).
  - The template and tasks skills stay.
- **Existing notes:** nothing is deleted or rewritten. Old daily/weekly sheets are ordinary notes.

## Kept

- `utils/periods/period.ts`: date math behind `{{weekSheet}}` and the other sheet-name tokens. Those tokens stay as plain names (`2026-W42`) for file names and links.
- Template tokens, prompts, routing keys, the template strip, `{{` field menu, "Save as template", "New template…".

## Packs model

- `isTemplatePath(path, folder)`: a `.md` file directly in the templates folder or in one of its direct subfolders.
- `TemplateEntry` gets `pack?: string`, the subfolder name.
- `listTemplates` lists both, sorted by pack (loose first), then name.
- `templatePacks(folder, paths)` groups the entries.
- `utils/templates/template-packs.ts` holds `BUILTIN_PACKS`. Each pack is `{ id, name, description, templates: { fileName, body }[] }`, built from the starters plus journal templates.

## Using a template (createNoteFromTemplate)

- A template with `file_name` doesn't ask for a title. Its `{{title}}` is the expanded file name.
- If `<folder>/<file_name>.md` exists it opens unchanged. Otherwise the note is created there.
- A template without `file_name` asks for a title as before and gets a unique name.
- `useTemplateNotes().useTemplate(entry)` runs it from the Templates page. The palette's **New note from template…** goes through the same path.

## Templates page

- Header: back to the editor; **New template**; **New pack**.
- **Your templates:** a section per pack (and Loose), each template with **Use** and **Edit** (opens the file in the editor). Each pack has **Duplicate** and **Delete**, both through the existing vault file operations: delete to trash, duplicate as a folder copy.
- **Template packs:** the built-in packs. Each one shows its templates and has **Add to vault** (or **Added**, when every file exists).
- No vault: a short line with Open vault.
- Entry points: a sidebar **Templates** item where Today was, and a **Templates** palette command.

## Docs

- Rewrite `periodic-sheets` as `template-packs` in /documentation.
- Update templates, get-started, editor-workspace, ai-features and keyboard-shortcuts.
- Update component docs and READMEs for every touched file.

## Release

Minor: 6.15.0.
