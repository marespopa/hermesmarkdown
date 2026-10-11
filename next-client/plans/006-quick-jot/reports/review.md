# Quick jot to today's sheet — review

## Review 1

**Scope:** the uncommitted working tree (32 modified files, 11 new), checked against `plans/006-quick-jot/prd.md`, Phases 1 and 2.

### Verdict: Approve with nits

### Checks

| Check | Result | Notes |
|---|---|---|
| `corepack yarn tsc --noEmit` | ✅ pass | no output |
| `corepack yarn lint` | ❌ fail, **not caused by the change** | Every error is in a stray nested build output, `next-client/next-client/.next/dev/static/chunks/*.js` (katex chunks etc.: `no-unsafe-finally`, `no-this-alias`, …). That folder is git-ignored and not in the diff. Linting all changed and new source/test files directly (`corepack yarn eslint <files>`) gives 0 errors and 0 warnings. Deleting `next-client/next-client/` (or ignoring it in the ESLint config) makes `yarn lint` usable again. |
| `corepack yarn vitest run` | ✅ pass | 201 files, 1534 tests. The new/changed tests ran: `utils/quick-jot.test.ts`, `utils/text-diff.test.ts`, `editor/hooks/use-quick-jot.test.tsx`, `editor/components/QuickJot.test.tsx`, `editor/utils/tab-shortcuts.test.ts`, `hooks/file-system/use-template-notes.test.ts`, `MarkdownEditor.test.tsx`, `KeyboardShortcutsOverlay.test.tsx`, `HomeFeed.test.tsx`. |
| `corepack yarn build` | ✅ pass | all 30 routes generated |

### PRD coverage

| Requirement | Status | Evidence |
|---|---|---|
| Palette command **Quick jot** (Document, keywords, shortcut shown, `disabledReason`) | done | `app/editor/hooks/use-quick-jot-entry.ts:20-33` |
| Ctrl+Alt+J on every OS; Mac matched by `code`, AltGr chars off Mac left alone | done | `app/editor/utils/tab-shortcuts.ts:7-17` |
| Shortcut ignored while the palette or a global dialog is open; pressing it again refocuses; disabled reason shown as an error toast | done | `use-quick-jot-entry.ts:38-54` |
| No vault → `Open a vault first`; restoring → `Vault is loading` | done (order differs from the PRD, see the note below) | `app/editor/page.tsx:289` |
| No clash with app shortcuts / CodeMirror keymaps | done | no `Mod-Alt-j` binding in the app; the HomeFeed `j` handler skips events with modifiers (`HomeFeed.tsx:201`) |
| Input: placeholder, caption with the date when it opened, **Add** button, transparent backdrop, mobile `pt-3` | done | `app/editor/components/QuickJot.tsx:33-39, 86-119` |
| Enter submits (IME-safe); empty input closes without writing | done | `QuickJot.tsx:46-49, 107-111` |
| Escape closes and clears; click outside closes and keeps the text | done | `QuickJot.tsx:62-68, 91` |
| Pasted multi-line text joined | done | `QuickJot.tsx:72-83`, also `quick-jot.ts:17` |
| `formatJotLine` / `appendJotLine` / `jotTime` as specified (regex, CRLF, never trims) | done | `app/utils/quick-jot.ts:5-32` |
| "Today" = date at Enter | done | `use-quick-jot.ts:69` (`now` is the default when `addJot` is called) |
| `writeNewNote` `open` option + return value; `resolveTodayNote`; `ensureTodayNote` threaded through `use-file-crud` | done | `use-template-create.ts:507-551, 572-622`; `use-file-crud.ts:67,96` |
| Sheet created like Today's sheet, not opened, no `Created:` toast | done | `use-template-create.ts:538-546` |
| Open sheet: fresh read → `reconcileWithDisk` → append → set buffer → save | done | `use-quick-jot.ts:44-58` |
| Sheet not open: disk + append → `saveFile`, no tab | done | `use-quick-jot.ts:55-58` |
| `isAutoSave = true` (no extra toast); background `indexVaultTags()` | done | `use-quick-jot.ts:58-59` |
| Serialized jots | done | `use-quick-jot.ts:69-73` |
| Outcome handling: added toast with **Open**; cancelled / failed-not-open → reopen with text; failed-in-buffer → clear | done | `QuickJot.tsx:50-59` |
| `showActionToast` | done | `app/components/Toastr/index.tsx:59-78` |
| `changedRange` + minimal editor sync | done | `app/utils/text-diff.ts:57-75`; `use-codemirror-editor.ts:229-238` |
| `isPathInLayout` moved to `atoms/utils.ts`, task write-back uses it | done | `app/atoms/utils.ts:18-22`; `use-task-writeback.ts:29` |
| `atom_quickJot`, `atom_jotTimePrefix` | done | `app/atoms/ui-atoms.ts:243-246` (file now 385 lines) |
| Keyboard shortcuts overlay row | done | `KeyboardShortcutsOverlay.tsx:33` |
| Files settings: Daily Sheets description; **Time on Quick Jots** toggle (Phase 2) | done | `FilesSettings.tsx:53, 65-69` |
| Phase 2: time prefix in `addJot` | done | `use-quick-jot.ts:33,37` |
| Phase 2: Today row menu **Quick jot** (existing and missing sheet), only with a vault | done | `use-home-feed.ts:129`; `HomeFeed.tsx:264`; `FeedRow.tsx:69, 142-145` |
| In-app docs: `keyboard-shortcuts.tsx` extracted, Quick jot row, `quick-jot` item after home-feed, home-feed pointer, settings-mobile row | done | `documentation/content/keyboard-shortcuts.tsx:40`; `quick-jot.tsx`; `get-started.tsx:202-204, 287, 356` (now 358 lines); `settings-mobile.tsx:48` |
| Every touched source file < 400 lines | done | largest: `page.tsx` 389, `ui-atoms.ts` 385, `get-started.tsx` 358 |
| No new network calls | done | none in the new code |

All acceptance criteria are covered by code and tests. The one exception is the mobile "input sits above the keyboard" check: the code handles it with a top-anchored panel (`pt-3`), but it can only be confirmed on a device. Per project rules I did not drive the app with a browser.

**Deviations from the PRD (all accepted, no action needed):**
- `disabledReason` checks `isVaultLocked` before `!vaultHandle` (`page.tsx:289`). The handle is null while the vault restores, so the PRD's order would show "Open a vault first" during restore. The engineer's order is more accurate.
- Escape is handled in the panel's `onKeyDown` (`QuickJot.tsx:62-68`) instead of `dismissOn: "escape"`. This is needed because the overlay's `onClose` keeps the text, while Escape must clear it (D5). `stopPropagation` keeps the home feed's and the editor's window Escape handlers from firing.
- `lockScroll={false}` is added, so opening the input never touches the scroll of the view behind it.

### Findings

No blockers or majors. I checked these points and they hold:
- `useStore()` in `use-quick-jot.ts` is the app's default store (`CustomProviders` passes `getDefaultStore()`), the same as `contentStore` used by the task write-back.
- `saveFile(next, handle, 0, true, path)` with `providedPath === finalPath` doesn't rewrite `atom_openFiles` or change the active tab (`use-save-file.ts:190-219`). Its metadata step only updates `lastSavedContent` / `lastModified`.
- No `await` sits between reading `atom_openFiles` and writing it (`use-quick-jot.ts:46-53`), so keystrokes can't be lost there.
- `changedRange` with a cursor exactly at the end of the document: the insertion maps the cursor with the default `assoc = -1`, so the cursor stays before the jot.

**Minor**
1. `app/components/Toastr/index.tsx:80`: `showSaveStateToast =(status` lost its space. This is an accidental formatting edit to an untouched function. Fix: restore `showSaveStateToast = (status`.
2. `app/editor/components/home-feed/FeedRow.tsx:58-59`: the reflowed comment breaks after "instead; a" and leaves a short dangling line. Fix: reflow the paragraph.

### Tests & docs gaps

- Tests: every PRD-listed case is present, with two small gaps.
  - The two tests the PRD names for Escape and empty Enter (`QuickJot.test.tsx`) are there. There's no test that a click outside keeps the text (D5). This is optional.
  - The "shortcut is ignored while a global dialog is open" path isn't tested. Only the palette-open case is. Optional.
- Docs: `QuickJot.md` and its README row, `hooks/README.md` (`ensureTodayNote`, `open`, `isPathInLayout`), `atoms/README.md`, `Toastr.md`, `KeyboardShortcutsOverlay.md`, `HomeFeed.md`, `home-feed/README.md`, `FilesSettings.md`, `MarkdownEditor.md` and `ARCHITECTURE.md:78` are all updated. Nothing is missing.
- Naming rules: no "sidebar"/"rail", "iAWriter" or "Typora" in the new code or docs.

### Handoff

None required. The two minor nits can be folded into the release commit.
