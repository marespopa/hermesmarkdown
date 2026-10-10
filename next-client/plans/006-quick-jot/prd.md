# Quick jot to today's sheet — engineering PRD

## Context

Source: [brief.md](brief.md). In a daily worklog, logging a one-line thought should not mean leaving the current note. **Quick jot** opens a one-line input over the current view. Enter appends the line to the end of today's sheet (`<date>.md`, creating the sheet if needed) and closes the input. The current note, its scroll position and its cursor do not move.

What already exists:

1. **Today's sheet resolution and creation.** `use-template-create.ts#openTodayNote` (`app/hooks/file-system/use-template-create.ts:185-222`) finds the sheet in the index with `findTodayNote` (`app/utils/today-note.ts:31`). If there is none, it asks for the Daily Sheets folder the first time (`atom_todayFolder`, `ui-atoms.ts:242`), uses a Journal/Daily template (`matchTemplateForName`) or a dated `# heading`, and writes the file through `writeNewNote` (`:66-101`). **Problem:** `writeNewNote` always opens the note (`openFile`, `:93`), sets a pending scroll target and toasts `Created: …`. Quick jot must create the sheet without opening it.
2. **Writing to a note that isn't the active tab.** `useTaskWriteback` (`app/hooks/use-task-writeback.ts`) already does this. It updates the open buffer through `atom_fileContent(path)`, then calls `saveFile(content, handle, 0, false, path)`. That call updates `lastSavedContent` / `lastModified` and the tasks metadata for any path (`use-save-file.ts:116-160`). Its `isPathOpen` helper (`:13`) is private to that file.
3. **Disk wins.** `reconcileWithDisk` (`app/hooks/file-system/reconcile-disk.ts`) merges disk text into a cached tab. It keeps unsaved edits when the file on disk is unchanged. When both sides changed, disk wins and the browser text becomes a `local` snapshot.
4. **Command palette and shortcuts.** Commands are registered with `useRegisterCommand` (`CommandPaletteContext.tsx`, `Command.shortcut` / `disabledReason`). Window shortcuts live in `use-editor-shortcuts.ts`, and the Ctrl+Alt predicates live in `app/editor/utils/tab-shortcuts.ts` (`isNewFileShortcut` = Ctrl+Alt+N on every OS). The shortcut list is static in `KeyboardShortcutsOverlay.tsx:19` and in the docs (`app/documentation/content/get-started.tsx:352-446`).
5. **Overlay primitives.** `OverlayPanel` (portal, Escape / click-outside dismissal, focus trap; it restores focus to the element focused before it opened, e.g. the CodeMirror editor, `useOverlay.ts:74-125`) and `BareInput`.
6. **Live editor sync.** **Partly broken for this feature.** `use-codemirror-editor.ts:226-235` replaces the *whole* document when the atom value changes from outside the editor. If today's sheet is the note being edited, an appended jot would reset the cursor to the start or end of the document and replace the undo history with one full-document change.

What's missing: the jot input, the command and shortcut, append-to-sheet logic, a create-without-opening path for the sheet, an action toast, an optional time prefix, and docs. No `jot` code exists today (`grep -ri jot app` is empty).

## Behavior

**Opening**
- Palette command **Quick jot** (category Document, keywords `jot log capture today daily sheet worklog append quick note`). It shows the shortcut.
- Shortcut **Ctrl+Alt+J** on every OS (shown as `⌃⌥J` on Mac, `Ctrl+Alt+J` elsewhere). See Decisions D1.
- Works on the editor route in every view: any note, the draft, the home feed, split panes, mobile. The shortcut is ignored while the command palette or a global dialog (`atom_globalDialog`) is open. Pressing it again while the jot input is open only refocuses the input.
- Touch: the palette command (reachable from the mobile **Search files** button and the palette FAB), plus a **Quick jot** item in the home feed Today row's menu (long press or right-click, Phase 2).
- **No vault open, or the vault is still restoring:** the command is disabled with the reason `Open a vault first` (or `Vault is loading`). The shortcut shows the same reason as an error toast. The jot never goes to the draft (Decisions D2).

**The input**
- A single-line field near the top of the window over the current view, with a transparent backdrop. Placeholder `Add to today's sheet…`. A caption below reads `Enter adds to 2026-10-10 · Esc cancels`, using the date when the input opened. An **Add** button sits beside the field for touch.
- Opening the input does not change the active pane, the tab, the editor's scroll or its selection. On close, focus returns to whatever had it (the editor, the feed).
- **Enter** (not while an IME is composing) submits. Empty or whitespace-only text closes the input and writes nothing.
- **Escape** closes the input without writing and clears the text. **Click/tap outside** also closes without writing, but keeps the text for the next open (it is easy to tap outside by accident on a tablet).
- Pasted multi-line text is joined into one line: newlines become single spaces.

**Line format** (`formatJotLine`)
- The text is trimmed. If it already starts with list or task syntax, it is kept as typed: `-`, `*` or `+` followed by a space, optionally followed by a `[?]` checkbox and a space, or an ordered marker `\d+[.)]` followed by a space. So `- [ ] call back` adds an open task and `1. ship` stays ordered.
- Anything else becomes `- <text>`.
- With **Time on quick jots** on (Phase 2, default off), `HH:MM ` (24-hour local time) goes after the marker and checkbox: `- 14:20 deploy done`, `- [ ] 14:20 call back`, `1. 14:20 ship`.

**Appending** (`appendJotLine`)
- If the content is empty or whitespace-only, the result is `line + "\n"`.
- Otherwise the line goes on its own line at the very end. If the content doesn't end with a newline, one is added first. The line is then followed by a newline. Existing text is never changed (no trimming of trailing blank lines).
- The newline style follows the file: `\r\n` if the content contains `\r\n`, else `\n`.
- Examples: `# Friday…\n\n` → `# Friday…\n\n- a\n`. `notes` → `notes\n- a\n`.

**Target sheet**
- "Today" is the local date when Enter is pressed (a jot submitted just after midnight goes to the new day's sheet).
- The sheet is resolved exactly as **Today's sheet** resolves it: the Daily Sheets folder first, else any indexed `<date>.md` (shallowest path).
- If the sheet doesn't exist, it is created exactly as **Today's sheet** creates it: the same first-time folder prompt (cancel = nothing written), the same Journal/Daily template and template prompts, else the dated heading. It is **not** opened, and no `Created:` toast appears. The jot is then appended.

**Writing**
- *Sheet open in a tab* (in any pane, visible or not): read the file from disk with a fresh handle, reconcile the tab with `reconcileWithDisk` (disk wins; unsaved edits are kept if the disk file is unchanged, otherwise saved as a snapshot), append to the reconciled buffer, set the buffer, then save the whole buffer. Any unsaved edits in that tab are saved together with the jot, in every autosave mode (Decisions D3). A visible editor on that sheet shows the new line at once. The cursor, scroll and undo history stay put. Undo in that editor removes the jot (it is an ordinary change).
- *Sheet not open:* read from disk, append, write with `saveFile`. No tab is opened.
- After writing, `indexVaultTags()` runs in the background so the home feed preview, the tasks and the text search pick up the line.
- Jots are processed one at a time: a second Enter while the first is still writing waits its turn.
- Every vault backend uses the same path, `saveFile` → `writeFileContent`: local folder (File System Access), browser vault (OPFS, with the worker fallback) and GitHub workspace (an OPFS working copy; the line goes out with the next commit like any edit).

**Feedback**
- On success: a quiet success toast `Added to 2026-10-10`, using the sheet's base name, with an **Open** action that opens today's sheet through the same path as **Today's sheet** (the draft is saved first, the feed closes). No other toast appears (`saveFile` runs with `isAutoSave = true`).
- *Cancelled* (folder prompt, template prompts): nothing is written and the input reopens with the text.
- *Failure* (read/write error, permission): an error toast `Couldn't add to today's sheet`. If the sheet wasn't open, the input reopens with the text. If it was open, the jot is already in the buffer and is saved by the next autosave, so nothing is lost.

## Design

**State** (`app/atoms/ui-atoms.ts`, next to `atom_todayFolder`)
```ts
// Quick jot input: open flag and the text kept across an accidental close.
export const atom_quickJot = atom<{ open: boolean; text: string }>({ open: false, text: "" });
// Phase 2. Quick jots start with the local time (`- 14:20 …`).
export const atom_jotTimePrefix = atomWithStorage<boolean>("hermes_jot_time_prefix", false);
```
`ui-atoms.ts` is 381 lines, so both atoms fit (about 386). If it would pass 395, move the two into a new `app/atoms/jot-atoms.ts` and list it in `app/atoms/README.md`.

**Pure helpers.** New `app/utils/quick-jot.ts`:
```ts
export function formatJotLine(text: string, time?: Date | null): string | null; // null = nothing to add
export function appendJotLine(content: string, line: string): string;
export function jotTime(now: Date): string; // "14:20"
```

**Create the sheet without opening it.** In `use-template-create.ts`:
- `writeNewNote(folder, baseName, expanded, { unique, onExisting, open = true })` now returns `Promise<{ path: string; handle: FileSystemFileHandle } | null>` (null on error). With `open: false` it skips `openFile`, `atom_pendingScrollTarget` and the `Created:` toast, but still scans and indexes when it creates a file. The existing-file branch returns the fresh handle from `findExisting`.
- Extract the body of `openTodayNote` into `const resolveTodayNote = useCallback(async (now: Date, open: boolean) => …)` returning the `writeNewNote` result, or `null` on cancel.
  - `openTodayNote = (now = new Date()) => resolveTodayNote(now, true).then(() => undefined)`. Its behavior is unchanged.
  - `ensureTodayNote = (now = new Date()) => resolveTodayNote(now, false)`.
- Return `ensureTodayNote` from the hook, and pass it through `use-file-crud.ts` (and therefore `useFileSystem`).
- The file grows from 295 to about 315 lines.

**Write path.** New `app/editor/hooks/use-quick-jot.ts`:
```ts
export type JotResult = "added" | "cancelled" | "failed";
export interface JotOutcome { result: JotResult; sheetName?: string; keptInBuffer?: boolean }
export function useQuickJot(): { addJot: (text: string, now?: Date) => Promise<JotOutcome> };
```
- It uses `useFileSystem()` (`ensureTodayNote`, `indexVaultTags`), `useSaveFile().saveFile` and `useStore()`.
- `addJot`, in order:
  1. Run `formatJotLine(text, timePrefix ? now : null)`. If the result is null, return `"cancelled"`.
  2. `sheet = await ensureTodayNote(now)`. If `sheet` is null, return `"cancelled"`.
  3. `file = await sheet.handle.getFile()` and `disk = await file.text()`.
  4. Decide whether the sheet is open: `open = isPathInLayout(layout.rootContainer, path) && path in openFiles`.
  5. If open: `next = appendJotLine(reconcileWithDisk(state, disk, file.lastModified).content, line)`. Set `atom_openFiles[path]` to the reconciled state with `content: next`.
  6. Otherwise: `next = appendJotLine(disk, line)`.
  7. `ok = await saveFile(next, sheet.handle, 0, true, path)`.
  8. Fire-and-forget `indexVaultTags()`.
  9. Return `{ result: "added", sheetName }` if `ok`, where `sheetName` is the base name without `.md`. Otherwise return `{ result: "failed", keptInBuffer: open }`. Any throw is caught and logged with `console.warn`; after step 5 that gives `keptInBuffer: true`.
- Calls are serialized through a `useRef<Promise<unknown>>` chain.

**UI.** New `app/editor/components/QuickJot.tsx` (props `{ disabledReason?: string; onOpenSheet: () => void }`):
- Renders `OverlayPanel` (`variant="modal"`, `backdrop="transparent"`, `dismissOn={["escape","click-outside"]}`; container `items-start justify-center pt-[12vh]`, or `pt-3` on mobile chrome; panel `bg-overlay border border-edge rounded-xl`, width matching the palette).
- Inside: `BareInput` (`autoFocus`, `enterKeyHint="done"`, `aria-label="Quick jot"`), a `Button variant="tertiary"` labelled **Add**, and the caption in `text-ui-caption text-fg-faint`.
- Registers the command and owns the window `keydown` listener for the shortcut (only mounted on `/editor`).
- Submit:
  1. Close the input first (focus goes back to the editor).
  2. Call `addJot`.
  3. On `added`, clear the text and call `showActionToast(\`Added to ${sheetName}\`, "Open", onOpenSheet)`.
  4. On `cancelled`, or on `failed` with `keptInBuffer: false`, reopen with the text.
  5. On `failed` with `keptInBuffer: true`, clear the text: the jot is already in the open buffer, and reopening would duplicate it.

**Shortcut predicate.** In `app/editor/utils/tab-shortcuts.ts`:
```ts
// Ctrl+Alt+J on every OS (⌃⌥J on Mac). On Mac, Option turns `key` into "∆",
// so `code` is checked there; elsewhere `key` only, so AltGr+J characters
// (Ctrl+Alt on Windows layouts) still type.
export function isQuickJotShortcut(e: ShortcutEvent & Pick<KeyboardEvent, "code">, mac: boolean): boolean;
export function quickJotShortcutLabel(mac: boolean): string; // "⌃⌥J" | "Ctrl+Alt+J"
```
The predicate is `ctrlKey && altKey && !metaKey && !shiftKey && (key.toLowerCase() === "j" || (mac && code === "KeyJ"))`.

**Action toast.** In `app/components/Toastr/index.tsx`, add `showActionToast(message: string, actionLabel: string, onAction: () => void)`. It renders `toast.success((t) => <span …>{message}<Button variant="tertiary" onClick={() => { toast.dismiss(t.id); onAction(); }}>{actionLabel}</Button></span>, { ...successConfig, duration: 5000 })`. Nothing steals focus.

**Minimal editor sync.** In `app/utils/text-diff.ts`, add `changedRange(prev: string, next: string): { from: number; to: number; insert: string } | null`, which trims the common prefix and suffix. `use-codemirror-editor.ts:228-234` dispatches that range instead of `{ from: 0, to: current.length }`. An appended jot is then an insertion at the end of the document: the selection maps through it, the scroll doesn't jump, and existing external reloads get the same benefit.

**Why not write only to disk and let the file watcher pick it up?** The watcher polls (30 s to 5 min) and uses `FileSystemObserver` only on Chromium. For a dirty tab, `reconcileWithDisk` would make disk win and push the user's unsaved edits into a snapshot, which is exactly the conflict the brief rules out. Writing through the buffer, as the task write-back does, keeps both.

## Phase 1: Jot to today's sheet

- `app/utils/quick-jot.ts` (new): `formatJotLine`, `appendJotLine`, `jotTime` as specified. List regex: `/^(?:[-*+] (?:\[.\] )?|\d+[.)] )/`.
- `app/utils/text-diff.ts`: add `changedRange`.
- `app/editor/hooks/use-codemirror-editor.ts:226-235`: dispatch `changedRange(current, value)`, keeping `userEvent: "input.external"`.
- `app/atoms/utils.ts`: add `isPathInLayout(node, path)` (moved from `use-task-writeback.ts#isPathOpen`). `use-task-writeback.ts` imports it.
- `app/atoms/ui-atoms.ts`: `atom_quickJot`.
- `app/hooks/file-system/use-template-create.ts`: the `writeNewNote` `open` option and return value, `resolveTodayNote`, `ensureTodayNote` (see Design). Update the header comment at `:179-184`.
- `app/hooks/file-system/use-file-crud.ts:67,95`: destructure and return `ensureTodayNote`.
- `app/editor/hooks/use-quick-jot.ts` (new, ~120 lines): `addJot` as designed. `timePrefix` is read from `atom_jotTimePrefix` once Phase 2 lands; in Phase 1, pass `null`.
- `app/editor/utils/tab-shortcuts.ts`: `isQuickJotShortcut`, `quickJotShortcutLabel`.
- `app/components/Toastr/index.tsx`: `showActionToast`.
- `app/editor/components/QuickJot.tsx` (new, ~150 lines; split the command and listener into `use-quick-jot-entry.ts` if it passes 200):
  - `useRegisterCommand({ id: "quick-jot", label: "Quick jot", category: "Document", shortcut: quickJotShortcutLabel(isMacPlatform()), disabledReason, keywords, action: open })`.
  - The window `keydown` listener: if `isQuickJotShortcut`, `preventDefault`, then show the `disabledReason` as an error toast, or open (ignore while `useCommandPalette().isOpen` or `atom_globalDialog` is set).
  - The overlay and submit flow. Opening sets `{ open: true }` and keeps the stored text.
- `app/editor/page.tsx` (387 lines → ~390): import `QuickJot` and render it after `<TokenCostDialog />` (`:286`) as `<QuickJot disabledReason={!vaultHandle ? "Open a vault first" : isVaultLocked ? "Vault is loading" : undefined} onOpenSheet={feedProps.onOpenToday} />`. Nothing else changes in the page.
- `app/components/KeyboardShortcutsOverlay/KeyboardShortcutsOverlay.tsx:31`: after **New file**, add `{ label: "Quick jot to today's sheet", keys: quickJotShortcutLabel(mac) }`.
- `app/editor/settings/sections/FilesSettings.tsx:52`: change the Daily Sheets Folder description to begin "Where Home's Today row and Quick jot create today's sheet…".

## Phase 2: Time prefix and the Today row entry

- `app/atoms/ui-atoms.ts`: add `atom_jotTimePrefix`.
- `app/editor/hooks/use-quick-jot.ts`: pass `now` to `formatJotLine` when `atom_jotTimePrefix` is on.
- `app/editor/settings/sections/FilesSettings.tsx`: after Daily Sheets Folder, add a `SettingItem` labelled **Time on Quick Jots**, described "Start each quick jot with the time, like - 14:20 deploy done.", with `<Toggle variant="soft" …/>`.
- Home feed Today row menu, so touch users have a visible entry point:
  - `app/editor/hooks/use-home-feed.ts`: add `onQuickJot` to `feedProps`, calling `store.set(atom_quickJot, (s) => ({ ...s, open: true }))`, only with a vault.
  - `HomeFeed.tsx` passes it to `FeedRow` for the `todaySheet` entry only.
  - `FeedRow.tsx`: add a `{ label: "Quick jot", icon: <HiOutlinePencil/> … }` menu item to both the existing and the missing Today row menus (`:130-140`).
  - `HomeFeed.tsx` is 330 lines; the change is +3.

## Tests

Phase 1:
- `app/utils/quick-jot.test.ts` (new):
  - Plain text becomes `- text`.
  - `- `, `* `, `+ `, `- [ ] `, `- [x] `, `1. `, `2) ` are kept as typed.
  - `-text` becomes `- -text`.
  - Whitespace-only text returns null.
  - Newlines are joined into one line.
  - `appendJotLine`: empty or whitespace content; content with and without a trailing newline; a trailing blank line is kept; CRLF.
  - `jotTime` zero-pads (`vi.setSystemTime` is not needed; pass a Date).
- `app/utils/text-diff.test.ts` (new or extended): `changedRange` for an append, a middle edit, identical strings (null), and a full replace.
- `app/hooks/file-system/use-template-notes.test.ts` `describe("openTodayNote")`: add `ensureTodayNote` cases.
  - It creates the sheet (folder prompt, template) without calling `openFile` or setting `atom_pendingScrollTarget`, and returns `{ path, handle }`.
  - For an existing sheet it returns its path and handle without opening it or writing.
  - A cancelled folder prompt returns null and writes nothing.
  - The existing `openTodayNote` cases still pass.
- `app/editor/hooks/use-quick-jot.test.ts` (new; mock `useFileSystem`, `useSaveFile`, `next/navigation`; Jotai `<Provider>`/store):
  - Sheet not open: `saveFile` gets the disk text plus the jot, with `isAutoSave = true`, and `atom_openFiles` is unchanged.
  - Sheet open and clean: the buffer and the save both get the appended text.
  - Sheet open with unsaved edits and an unchanged disk file: the jot is appended after the unsaved edits, and those edits are saved with it.
  - Sheet open and dirty, and the disk changed: the disk text plus the jot is saved, and the unsaved text is kept as a `local` snapshot.
  - `ensureTodayNote` → null gives `cancelled` and no save.
  - `saveFile` → false on a sheet that isn't open gives `failed` with `keptInBuffer: false`; on an open sheet, `keptInBuffer: true`.
  - Two concurrent `addJot` calls end with both lines in order.
  - Dates use `vi.setSystemTime`.
- `app/editor/components/QuickJot.test.tsx` (new; mock `use-quick-jot`, `next/navigation`, Toastr):
  - The palette command is registered and disabled with the reason when `disabledReason` is set.
  - Ctrl+Alt+J opens the input. Escape closes it without calling `addJot` and clears the text.
  - Enter calls `addJot` with the text and closes the input.
  - Enter during IME composition does nothing.
  - Enter on empty text doesn't call `addJot`.
  - `added` shows the action toast, and **Open** calls `onOpenSheet`.
  - `cancelled` reopens the input with the text.
  - The shortcut is ignored while the palette is open.
- `app/editor/utils/tab-shortcuts.test.ts` (new or extended):
  - `isQuickJotShortcut` matches Ctrl+Alt+J everywhere and Ctrl+Opt with `key: "∆", code: "KeyJ"` on Mac.
  - It rejects `key: "í", code: "KeyJ"` off Mac (AltGr), Cmd+Alt+J, Ctrl+Shift+J, and Ctrl+Alt+Shift+J.
  - It doesn't collide with `isNewFileShortcut` or `isCloseTabShortcut`.
- `app/editor/components/MarkdownEditor.test.tsx:361`: the existing external re-sync test still passes. Add a test that the selection in front of an appended external change is unchanged.
- `KeyboardShortcutsOverlay.test.tsx`: the Quick jot row is listed.

Phase 2:
- `quick-jot.test.ts`: the time goes after the marker and checkbox (`- [ ] 14:20 x`, `1. 14:20 x`).
- `use-quick-jot.test.ts`: with `atom_jotTimePrefix` on, the written line has the time (`vi.setSystemTime`).
- `FeedRow` / `HomeFeed.test.tsx`: the Today row menu shows **Quick jot** and calls `onQuickJot`; other rows don't.

## Docs

- `app/editor/components/QuickJot.md` (new) and a row in `app/editor/components/README.md`.
- `app/hooks/README.md`: in the `use-template-create.ts` row, document `ensureTodayNote` and the `open` option of `writeNewNote`; in the `use-task-writeback.ts` row, note `isPathInLayout`.
- `app/atoms/README.md`: add `atom_quickJot` and `atom_jotTimePrefix` to the `ui-atoms.ts` row, and `isPathInLayout` under `utils.ts`.
- `app/components/Toastr/Toastr.md`: `showActionToast`.
- `app/components/KeyboardShortcutsOverlay/KeyboardShortcutsOverlay.md` if it lists rows.
- `app/editor/components/home-feed/README.md` / `HomeFeed.md` (Phase 2): the Today row menu item.
- `ARCHITECTURE.md`: add one line under Runtime Components or Vault templates saying Quick jot appends to today's sheet through `saveFile`.
- **In-app docs.** `app/documentation/content/get-started.tsx` is already 446 lines.
  - Move the `keyboard-shortcuts` item (`:352` to the end of its object) into a new `app/documentation/content/keyboard-shortcuts.tsx` that exports `keyboardShortcutsItem`. Import it into the `items` array in the same place.
  - In that table, add `{ label: "Quick jot to today's sheet", shortcut: "CTRL+ALT+J" }` to the **Tabs & files** group.
  - Add a `quick-jot` item after `home-feed`. It covers: how to open Quick jot (shortcut, palette, and the Today row menu on touch in Phase 2); Enter and Escape; list and task syntax kept as typed; the time option (Phase 2); creation of the sheet on first use; behavior when the sheet is open with unsaved edits; and that it needs an open vault. Keywords: `quick jot capture log append today daily sheet worklog shortcut`.
  - In the `home-feed` item, add one sentence pointing to Quick jot.
  - `settings-mobile.tsx`: mention **Time on Quick Jots** under Files (Phase 2).

## Acceptance criteria

- [ ] **Quick jot** is in the palette with the shortcut shown, and is disabled with "Open a vault first" when no vault is open.
- [ ] Ctrl+Alt+J (⌃⌥J on Mac) opens the input from a note, the draft, the home feed and a split pane.
- [ ] Ctrl+Alt+J doesn't clash with any app shortcut in `use-editor-shortcuts.ts`, `CommandPaletteContext.tsx` or the CodeMirror keymaps.
- [ ] Opening and closing the input leaves the active note's cursor, selection and scroll unchanged, and focus returns to the editor.
- [ ] Enter appends one line at the end of today's sheet on its own line. Plain text becomes `- text`; list and task syntax is kept.
- [ ] Escape writes nothing. Empty Enter writes nothing.
- [ ] With no sheet yet, Quick jot creates it the same way Today's sheet does (folder prompt the first time, template, folder setting) and doesn't open it. Cancelling the prompt writes nothing and reopens the input with the text.
- [ ] Sheet open and visible: the line appears live with no conflict prompt. The cursor in that editor stays in place.
- [ ] Sheet open with unsaved edits: the edits and the jot are both on disk afterwards, and nothing is lost.
- [ ] If the file changed on disk underneath a dirty tab, disk wins and the unsaved text is kept as a snapshot.
- [ ] A success toast "Added to YYYY-MM-DD" appears with **Open**, which opens the sheet.
- [ ] Works on local folder, browser and GitHub vaults; on mobile the input sits above the keyboard and **Add** submits.
- [ ] (Phase 2) **Time on Quick Jots** adds `HH:MM` after the list marker. The Today row menu offers **Quick jot**.
- [ ] Shortcut listed in the Keyboard shortcuts overlay and the docs. Docs updated. Every touched source file is under 400 lines (including `get-started.tsx` after the extraction).
- [ ] No new network calls.

## Decisions

- **D1. Shortcut: Ctrl+Alt+J on every OS (⌃⌥J on Mac).**
  - Rejected alternatives:
    - Ctrl+Shift+J opens DevTools in Chrome and Edge, and pages can't override it.
    - Cmd+Opt+J opens the JavaScript console in Chrome on Mac.
    - Cmd+Opt+K opens the Firefox console on Mac.
    - Mod+Alt+L is Chrome/Safari Downloads on Mac and lock screen on Ubuntu.
    - Mod+Shift+U is IBus Unicode input on Linux.
  - Ctrl+Alt+J has no default binding in Chrome, Edge, Firefox or Safari, nor in Windows, GNOME, KDE or macOS.
  - It follows the app's existing Ctrl+Alt+N (New file) pattern, the J stands for "jot", and it's free in the app and in the CodeMirror keymaps (`Mod-Alt-1…6` and `Mod-Alt-c` are bound; `j` is not).
  - Known trade-offs: macOS VoiceOver uses Ctrl+Opt as its modifier while it's running (the same as New file). On Windows layouts where AltGr+J types a character (e.g. Hungarian `í`), the character wins because the match is on `key` there.
- **D2. With no vault, the command is disabled rather than jotting into the draft.** The draft isn't today's sheet, so appending there would be a surprise. This matches **Today's sheet**, which is disabled with "Open a vault first".
- **D3. With a dirty open sheet, the jot and the unsaved edits are saved together right away, in every autosave mode.** "Saved with it" in the brief, and the Tasks page write-back precedent (`use-task-writeback.ts`, which also saves the open buffer). Leaving the jot unsaved in a background tab under manual autosave would risk losing it.
- **D4. The time prefix is an off-by-default setting** (Settings → Files → Time on Quick Jots), in 24-hour `HH:MM` placed after the list/task marker. This gives sortable, locale-neutral log lines and keeps `- [ ]` tasks valid.
- **D5. Click outside keeps the typed text; Escape discards it.** Escape is the brief's "close without writing". An outside tap on a tablet is often accidental.
- **D6. Close first, then write.** The first-time folder prompt and template prompts are global dialogs. Showing them over an open, focus-trapped jot overlay would fight over focus. On cancel or failure the input reopens with the text.
- **D7. The minimal-range editor sync (`changedRange`) is in scope.** Without it, jotting into a sheet that is also the active note moves its cursor, which breaks "cursor stays where it is".
- **D8. The touch entry point is the palette, plus a Today row menu item in Phase 2.** No new always-visible chrome button: the app is minimal-chrome, and the palette is one tap away on mobile.

## Out of scope / Deferred

- Choosing a target note, placing jots under a heading, multi-line input, attachments, voice capture, OS-level global shortcuts (per the brief).
- A user-configurable shortcut, and 12-hour or custom time formats.
- A persistent jot history or undo-from-toast.
- Jotting from `/editor/tasks`, `/editor/files` or `/editor/settings`. Quick jot is mounted on `/editor` only, like the other editor shortcuts.

## Open questions

- Should the success toast also appear when the sheet is visible in a pane, where the new line is already on screen? The plan always shows it, for consistency.
- Should the shortcut also work on the Tasks and Explorer routes? Deferred above; it is cheap to add later by mounting `QuickJot` in the editor layout.
