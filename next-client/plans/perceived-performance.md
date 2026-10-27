# Perceived performance: instant opens, lighter keystrokes

## Problem

The editor core is fast. `corepack yarn bench` (`app/editor/codemirror/editor-performance.bench.ts`) measured typing at 1.9 ms per keystroke on a 2,000-line note and 6.6 ms on a 20,000-line one, with screen restyling under 0.5 ms at both sizes. The waits people still notice are around that core:

- **Saving open notes to the browser blocks typing (the main bottleneck).** `atom_openFiles` is kept in `localStorage` through `debouncedJSONStorage` (`app/atoms/file-atoms.ts:31-50`). Each time typing pauses for 400 ms, it serializes every open note on the main thread: `content`, `lastSavedContent` and snapshots for all of them. It then writes the result with a synchronous `localStorage.setItem`. Measured on a phone with Node, `JSON.stringify` of 8 open notes alone takes 16.6 ms at 2,000 lines (~171 KB each) and 198 ms at 20,000 lines (~1.7 MB each), not counting the write. A 400 ms pause happens constantly while writing, so this is a repeating hitch. Large notes also hit the ~5 MB `localStorage` quota (a `storage-full` recovery issue), and after that browser-only edits stop being backed up.
- **Opening a note always waits for the disk.** `useOpenFile` (`app/hooks/file-system/use-open-file.ts`) shows the title and, after ~150 ms, a skeleton (`PaneLeaf.tsx:217-222`). It then reads the file before any text shows, even when `atom_openFiles` already holds that note's text.
- **Switching notes loses your place.** Going back to a note doesn't reliably restore its caret and scroll position.
- **Startup starts with an empty sidebar.** The file tree waits for the vault scan.
- **Every keystroke re-renders outside the editor.** `use-codemirror-editor.ts:164` copies the document on every change (measured at only 0.06–0.37 ms), and `atom_content` writes a new `atom_openFiles` object, which re-renders everything subscribed to it. The cost of those re-renders hasn't been measured; it needs a real browser.
- **Git Changes in Note recomputes the whole file on each keystroke while it's on.** `git-changes.ts:118` and `:64` rebuild the diff summary and the deleted-line blocks for the whole document. Only the `+` markers are limited to the viewport. It costs nothing while it's off.
- **Large notes pay their full cost on open.** A 20,000-line note takes ~92 ms to parse and ~50 ms (up to 243 ms) to find and parse its tables. Both happen before the note is usable. After the open, table updates are incremental (`updateTables`).
- **We can't measure what users feel.** The benchmark runs in jsdom without layout or paint, so nothing measures click-to-text or keystroke-to-paint in a real browser.

Project rules this must follow: optimistic UI (`AGENT_RULES.md` → Optimistic UI), saved content on disk always wins over cached text, and editing is predictable with no surprises.

## Desired behavior

Work through these in order. Each phase ships on its own and has its own tests.

### Phase 0 — Measure in the real browser (dev only)
- Add `performance.mark`/`measure` around: click/Enter → note text painted; keystroke → next paint; the open-notes storage write; app start → sidebar tree painted; palette open → first paint.
- Show them in a dev-only readout (hidden in production builds; toggled from the palette with a setting or a query flag). It shows the last value and the p75 for each measure, and flags long tasks over 50 ms.
- Add a benchmark case to `editor-performance.bench.ts` for typing with Git Changes on.
- These numbers are the before/after for every phase below.

### Phase 1 — Non-blocking storage for open notes
- Move the open notes' text out of `localStorage` into IndexedDB, one record per note, so a write touches only the note that changed and never serializes the others.
- Don't persist `lastSavedContent` for notes backed by a file: it can be read back from disk. Persist it only where disk can't provide it (the draft). Snapshots move into their own records too.
- Keep the small, non-text state (paths, file names, which note is active) in `localStorage` or with the layout, so startup can render the shell at once.
- Write when the browser is idle (`requestIdleCallback` with a timeout), coalescing writes per note. Flush synchronously-enough on `pagehide`/`visibilitychange` as today, so no edit is lost on close.
- One-time migration: read the existing `openFiles` key, write it to IndexedDB, then remove the key. If IndexedDB is unavailable (private mode, blocked), fall back to the current `localStorage` path and keep the `storage-full` recovery issue.
- Loading on startup is asynchronous now: the pane must render the note once its record arrives, without a flash of the empty state (reuse the delayed skeleton).
- Target, measured with Phase 0: no main-thread task over 16 ms from persisting while typing in a 20,000-line note with 8 large notes open.

### Phase 2 — Start loading before the click
- When a note is highlighted in the command palette, or the pointer rests on a file-tree / Open Notes / pinned row for ~100 ms (no hover on touch), prefetch its text: `getFile()` + `text()` into a small in-memory cache keyed by path, also storing `lastModified`.
- `openFile` uses the cached text when the file's `lastModified` still matches. Otherwise it reads again as it does today.
- Limits: at most one prefetch running at a time (a newer target cancels or ignores the older one), cap the cache (for example the last 8 entries and a total size limit), never prefetch files over a size limit, and skip prefetching while the user is typing.
- Prefetch never changes visible state. It only warms the cache.

### Phase 3 — Instant return to recent notes
- Remember each open note's caret/selection and scroll position, and restore them when the note comes back to the front, including after a reload. Store this per path with the open-note records from Phase 1.
- Store `lastModified` per open note (today `atom_fileLastModified` is only a single global value).
- Switching to a note that is already open shows its text at once. A cheap `getFile()` metadata check runs behind it. If `lastModified` changed, the disk text replaces the shown text before the editor accepts typing (disk wins). If the user's browser-only edits differ, they're kept as a `local` snapshot exactly as `useOpenFile` does today.
- The swap must not surprise the user: no caret jump when the text is unchanged, and no lost keystrokes. If the check hasn't finished within ~50 ms, keep the editor read-only until it does, showing only the existing delayed indicator.

### Phase 4 — Show the last file tree on startup
- Persist a light snapshot of the vault tree (paths, names, folder structure, no contents) when a scan finishes.
- On startup, render the snapshot right away and reconcile it when the real scan finishes, without reordering or flicker for unchanged rows. Rows that no longer exist disappear quietly.
- Clicking a row from the snapshot before the scan finishes opens the file through the vault handle by path. If the file is gone, show a toast and drop the row (roll back).

### Phase 5 — Keep keystrokes cheap
- Audit what subscribes to `atom_openFiles` / `atom_content` (sidebar rows, outline, word count, save state, `atom_hasOpenFileContent`) and make sure each re-renders only when its own data changes. For example, split the per-note text from the per-note metadata, or use `selectAtom` with equality checks. The word count already waits while typing (`WordCountPill.tsx:42`). Bring the outline and any indexing in line with that.
- Git Changes in Note: recompute the diff summary and the deleted blocks after a short pause in typing (or limit them to the viewport), not on every keystroke. The `+` markers can stay per keystroke.
- Saving, autosave, conflict checks and the dirty marker must keep working exactly as now.
- Target, measured with Phase 0: keystroke → paint p75 under 8 ms on a 2,000-line note and under 16 ms on a 20,000-line note on a mid-range phone, with Git Changes off and on.

### Phase 6 — Reveal large notes in stages
- For notes above a line threshold (for example 3,000 lines), paint the text with light styling first. Run the full parse and the table/formula widgets for the visible screen next, and for the rest of the note in idle chunks.
- Table widgets appear without changing line height under the caret or scroll position (follows "reveal may add width, never change weight or line height").
- Small notes behave exactly as today.

## Out of scope
- Changing the editor's look, the caret-line syntax reveal, or how tables render.
- Moving tables or Git Changes out of the note into a separate view. Their cost is on open (tables) or opt-in (git), and Phases 5–6 address it in place.
- Server-side or network performance (the app is local-first).
- Reworking the vault indexer beyond what Phases 4–5 need.
- Web workers for parsing or diffing. Note it as a follow-up if Phases 5–6 aren't enough.
- Bringing back tabs, splits or any removed chrome.
