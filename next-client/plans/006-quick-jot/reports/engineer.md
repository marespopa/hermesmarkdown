# Quick jot — engineer report

## Run 1

PRD: `next-client/plans/006-quick-jot/prd.md`. Phases 1 and 2 are both implemented. Mailbox was empty (fresh run).

### Built
- **Line format / append** (`formatJotLine`, `appendJotLine`, `jotTime`): `app/utils/quick-jot.ts:8-32`. List regex as specified; newlines joined; time goes after the marker and checkbox; CRLF follows the file.
- **Minimal editor sync**: `changedRange` at `app/utils/text-diff.ts:64`; dispatched at `app/editor/hooks/use-codemirror-editor.ts:232` (still `userEvent: "input.external"`).
- **`isPathInLayout`** moved to `app/atoms/utils.ts:19`; `use-task-writeback.ts` imports it.
- **Atoms**: `atom_quickJot` and `atom_jotTimePrefix` at `app/atoms/ui-atoms.ts:244-246` (file is now 385 lines).
- **Create without opening**: `writeNewNote(…, { open })` returns `{ path, handle } | null` (`use-template-create.ts:68`). `resolveTodayNote` is at `:192`, `openTodayNote` at `:229` (behaviour unchanged) and `ensureTodayNote` at `:235`. They are exported from the hook and from `use-file-crud.ts:67,96`, so `useFileSystem()` has them too.
- **Write path** `useQuickJot().addJot`: `app/editor/hooks/use-quick-jot.ts:29`. It follows the PRD's nine steps. Jots are serialized through a promise chain in a ref, and the time prefix is read from `atom_jotTimePrefix`.
- **Command + shortcut**: `app/editor/hooks/use-quick-jot-entry.ts:15`. It registers the `quick-jot` command (Document, shortcut label, keywords, `disabledReason`) and adds the window `keydown` listener. The listener is ignored while the palette or a global dialog is open, refocuses the input when it's already open, and shows the disabled reason as an error toast.
- **Shortcut predicate / label**: `app/editor/utils/tab-shortcuts.ts:10,15`.
- **Action toast** `showActionToast`: `app/components/Toastr/index.tsx:59`.
- **UI** `QuickJot`: `app/editor/components/QuickJot.tsx`.
  - It uses `OverlayPanel` with a transparent backdrop. Click-outside closes it; Escape is handled inside the panel so it also clears the text.
  - Inside are a `BareInput` and an **Add** `Button`, plus the caption with the date the input opened.
  - IME-safe Enter. Pasted newlines become spaces.
  - Submit closes first, then writes. It shows the action toast on success, reopens with the text on cancel or failure, and clears the text when the jot is already kept in the buffer.
- **Page**: mounted at `app/editor/page.tsx:289` (now 389 lines).
- **Keyboard shortcuts overlay** row: `KeyboardShortcutsOverlay.tsx:33`.
- **Settings**: the Daily Sheets Folder description now mentions Quick jot, and the Phase 2 **Time on Quick Jots** toggle is added (`FilesSettings.tsx:53,66`).
- **Phase 2 Today row menu**:
  - `onQuickJot` in `use-home-feed.ts:129` (only with a vault).
  - `HomeFeed.tsx:49,264` passes it to the Today row only.
  - `FeedRow.tsx:69` adds the item to both the existing and the missing Today row menus.

### Tests/docs
- **Tests (new):** `app/utils/quick-jot.test.ts`, `app/utils/text-diff.test.ts`, `app/editor/hooks/use-quick-jot.test.tsx`, `app/editor/components/QuickJot.test.tsx`.
- **Tests (extended):**
  - `app/hooks/file-system/use-template-notes.test.ts` (`ensureTodayNote` ×3)
  - `app/editor/utils/tab-shortcuts.test.ts`
  - `app/editor/components/MarkdownEditor.test.tsx` (selection kept on an external append)
  - `app/components/KeyboardShortcutsOverlay/KeyboardShortcutsOverlay.test.tsx`
  - `app/editor/components/HomeFeed.test.tsx` (Today row menu)
- **Component docs:**
  - `app/editor/components/QuickJot.md` (new) and its row in `app/editor/components/README.md`
  - `HomeFeed.md`, `home-feed/README.md`, `MarkdownEditor.md`
  - `settings/sections/FilesSettings.md`, `Toastr/Toastr.md`, `KeyboardShortcutsOverlay.md`
  - `app/hooks/README.md`, `app/atoms/README.md`, `ARCHITECTURE.md` (Quick jot bullet under Runtime Components)
- **In-app docs:**
  - `app/documentation/content/keyboard-shortcuts.tsx` (new): the extracted `keyboardShortcutsItem`, plus the Quick jot row under Tabs & files.
  - `app/documentation/content/quick-jot.tsx` (new): `quickJotItem`, placed after `home-feed`.
  - `get-started.tsx` went from 446 to 358 lines and now has a pointer to Quick jot from the home feed section.
  - `settings-mobile.tsx`: the Time on Quick Jots row.

### Decisions
- **`disabledReason` order:** "Vault is loading" is checked before "Open a vault first". The PRD had the reverse, but while the vault is restoring `vaultHandle` is usually still null, so the loading reason would never show.
- **Quick jot doc item:** it lives in its own file (`quick-jot.tsx`), like the extracted shortcuts item, so `get-started.tsx` stays well under 400 lines.
- **Palette command:** the action closes the palette first and opens the input on the next frame. The palette's focus trap then restores focus to the editor before Quick jot records "previously focused", so focus returns to the editor when the input closes. Otherwise it would go back to the palette's detached field.
- **Text cleared on submit:** the text is cleared as soon as the input closes, and restored on cancel or failure. Reopening while a write is in flight therefore never offers the same text twice.
- **Escape vs. click outside:** `OverlayPanel` gets `dismissOn={["click-outside"]}`, and Escape is handled in the panel. This lets Escape clear the text while click-outside and the back button keep it (D5). `lockScroll={false}` leaves the page scroll alone.
- **`addJot` uses `useStore()`** (the Provider store) rather than `contentStore`, so tests run against an isolated store.

### Not done / open
- The PRD's open questions are left as specified: the toast always shows, even when the sheet is visible, and Quick jot is `/editor` only.
- Known PRD trade-offs remain: VoiceOver's Ctrl+Opt modifier, and AltGr+J layouts on Windows.
- Per the rules, tests and typecheck were **not run**.

### To verify
```bash
cd next-client
corepack yarn tsc --noEmit
corepack yarn vitest run app/utils/quick-jot.test.ts app/utils/text-diff.test.ts app/editor/hooks/use-quick-jot.test.tsx app/editor/components/QuickJot.test.tsx app/hooks/file-system/use-template-notes.test.ts app/editor/utils/tab-shortcuts.test.ts app/editor/components/MarkdownEditor.test.tsx app/components/KeyboardShortcutsOverlay/KeyboardShortcutsOverlay.test.tsx app/editor/components/HomeFeed.test.tsx
```
Manual checks in the app:
1. Ctrl+Alt+J (⌃⌥J) opens the input from a note, the draft, the home feed and a split pane. The cursor and scroll of the note don't move, and focus returns to the editor when the input closes.
2. Run **Quick jot** from the palette, close the input, and check that focus is back in the editor.
3. With no daily folder set, the first jot asks for the folder and creates the sheet without opening it. The toast **Open** opens the sheet.
4. With today's sheet open and dirty in another pane, a jot appears live, the cursor there stays put, and both the edits and the jot are on disk.
5. With no vault, the command is disabled and the shortcut shows "Open a vault first".
6. On a tablet, long-press the Today row → **Quick jot**. The input sits at the top, and **Add** submits.
7. Settings → Files → **Time on Quick Jots** adds `- HH:MM …`.
