# Quick jot — architect report

## Run 1

**PRD:** `next-client/plans/006-quick-jot/prd.md`

**Summary** (2 phases)
- **Phase 1:**
  - A **Quick jot** palette command plus the **Ctrl+Alt+J** (⌃⌥J) shortcut. They open a one-line `OverlayPanel` input over any editor view; the active note, cursor and scroll are not touched.
  - Enter appends the line to the end of today's sheet. Plain text becomes `- text`; list and task syntax is kept as typed. Escape writes nothing.
  - If the sheet doesn't exist, it is created through the existing Today's sheet flow, without opening it: a new `ensureTodayNote` plus an `open: false` option on `writeNewNote`.
  - If the sheet is open in a tab, the jot goes through the buffer (reconciled with disk first, disk wins) and is saved with any unsaved edits. Otherwise it goes straight to disk through `saveFile`. Either way the app then re-indexes.
  - An "Added to YYYY-MM-DD" toast offers **Open**.
  - A small fix to the editor's external-sync effect: it now changes only the part of the text that differs, instead of replacing the whole document, so the cursor stays put when today's sheet is the note being edited.
- **Phase 2:** an off-by-default **Time on Quick Jots** setting (`- 14:20 …`), and a **Quick jot** item in the home feed Today row's menu (touch entry point).
- **Docs:** the in-app Quick jot section, the shortcut rows, and the `get-started.tsx` keyboard-shortcuts extraction (that file is already 446 lines).

**Already exists**
- Resolving and creating today's sheet (`use-template-create.ts#openTodayNote`, `utils/today-note.ts`): the folder prompt, templates and the folder setting.
- Writing to a note that isn't the active tab, with live buffer update and save: `use-task-writeback.ts`, `saveFile(…, path)`.
- Disk-wins merge of a dirty tab with disk (`reconcileWithDisk`).
- Palette command registration, `OverlayPanel` focus restore, `BareInput`, and the Ctrl+Alt shortcut predicates (`tab-shortcuts.ts`).

**Decisions to look at before handoff**
- **D1. Shortcut: Ctrl+Alt+J on all OSes.**
  - Rejected: Ctrl+Shift+J and Cmd+Opt+J (DevTools/console), Cmd+Opt+K (Firefox console on Mac), Mod+Alt+L (Downloads, Linux lock screen), Mod+Shift+U (IBus).
  - Caveats: VoiceOver's Ctrl+Opt modifier while VoiceOver is running, and AltGr+J layouts on Windows (those keep typing their character).
- **D2. No vault:** the command is disabled with "Open a vault first", rather than jotting into the draft.
- **D3. Dirty open sheet:** the jot and the unsaved edits are saved together immediately, even in manual autosave mode (the Tasks write-back does the same).
- **D5. Dismissal:** click outside keeps the typed text; Escape discards it.

**Open questions (non-blocking)**
- Should the toast also show when the sheet is visible on screen?
- Should Quick jot also work on the Tasks, Explorer and Settings routes? It is deferred; mounting it in the editor layout would cover them.

**Handoff:** "Implement next-client/plans/006-quick-jot/prd.md, phase 1"
