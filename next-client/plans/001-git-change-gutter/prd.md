# Git change gutter — engineering PRD

## Context

Source: [brief.md](brief.md). When the Git Changes setting is on, the editor marks each line that differs from the file's version at HEAD with a thin bar in the gutter: added, changed, or a marker where lines were deleted. The browser reads `.git` directly through the vault's `FileSystemDirectoryHandle`. Nothing runs git, and nothing writes to `.git`.

What exists (paths under `next-client/app/`):

1. **Vault handle.** `atoms/vault-atoms.ts:15` `atom_vaultHandle` holds the vault root (`FileSystemDirectoryHandle`). `atom_vaultDescriptor` (`:57`) is `{ kind: "local" }` for disk vaults, and something else for browser (OPFS) vaults. Only `local` vaults can have a real `.git`: `services/vault-archive` drops `.git/` paths on import (`vault-archive.test.ts:27`). `MarkdownEditor.tsx:93` already gets `vaultHandle` from `useFileSystem()`.
2. **`.git` is hidden from the app.** `hooks/file-system/vault-scan.ts:90` `SKIPPED_DIRS` skips `.git`, so no `.git` path ever reaches the file tree, indexes or `atom_liveHandles`. The feature reads `.git` itself, from the root handle. **No change to the scan.**
3. **Editor gutters.** `editor/codemirror/extensions.ts` builds a note's extensions, and `plain-text-extensions.ts` builds those for code and text files. Both take `BuildExtensionsOptions` (`extensions.ts:48`), whose toggles each live in a `Compartment` (line numbers `:91`, invisibles `:92`). `editor/hooks/use-codemirror-editor.ts` creates the compartments (`:111-121`) and reconfigures them from props in effects (`:194-240`). Notes have no gutter unless Line Numbers is on (`atom_lineNumbers`, off by default). Code files always number their lines (`code-editing.ts:31` `codeGutters`).
4. **Settings toggles.** `atoms/ui-atoms.ts:31-41` holds the `atomWithStorage` booleans. That file has **395 lines**, so the new atom goes in a new file. `editor/settings/components/SettingsCommands.tsx:36-42` lists the palette toggles (`toggle-invisibles` `:40`). `editor/settings/sections/EditorSettings.tsx:51-58` is the View group (Outline). `MarkdownEditor.tsx` has **366 lines** and reads the toggles at `:69-80`.
5. **Workers.** The pattern is a worker in `workers/`, a typed protocol file and a client in `services/` (`services/text-grep-client.ts` + `workers/text-grep.worker.ts` + `workers/text-grep-protocol.ts`). File handles are posted to the worker. `workers/README.md` indexes them.
6. **Inflate.** `fflate` (`^0.8.2`) is already a dependency. Git objects are zlib streams: use `unzlibSync` for loose objects, and streaming `Unzlib` for pack entries.
7. **Diff.** `utils/text-diff.ts` `diffWords` is an O(n·m) LCS over words, too slow for whole files. Add **`@codemirror/merge`**, a small package from the CodeMirror author that shares our `@codemirror/state`. Use only its `Chunk.build(a: Text, b: Text)`, which runs a time-limited line diff and returns `{ fromA, toA, fromB, toB }` chunks. Do not use its merge views.
8. **Disk refresh.** `hooks/use-file-watcher.ts` polls the open files (`MIN_INTERVAL` 30 s, backing off to 5 min) and observes them with `FileSystemObserver` where it exists (`file-observer.ts`). It never looks at `.git`.
9. **Colours.** These CSS variables already change per theme and mode (`app/globals.scss`, `app/theme-palettes.ts`): `--moss` (the sage accent), `--link` and `--danger` (`globals.scss:62,138`). Use them, and add no new tokens. The accent (`--clay`) is reserved for caret, focus and selection, so don't use it.
10. **Docs that say git stays outside.** `documentation/content/vault.tsx:155-176` (section `git`), `components/LandingPage/landing-content.ts:44-45,68`, and the palette row `documentation/content/editor-workspace.tsx:280`.

## Behavior

1. **Setting.** "Git Changes", off by default and stored per browser (`showGitChanges`). It is toggled from the palette ("Toggle Git Changes") or Settings → Editor → View. It applies to every editor pane at once.
2. **When it shows.** All of these must hold: the setting is on; the vault is `kind: "local"`; `.git` at the vault root is a **directory** (a `.git` *file*, as in worktrees and submodules, is unsupported); `.git/config` doesn't declare `objectformat = sha256`; and the pane shows a vault file (not `draft`). Otherwise nothing is added and no space is taken. A vault that sits in a subfolder of a repo shows nothing, because the browser can't reach folders above the picked one (see Out of scope).
3. **What it compares.** The editor's current text (unsaved edits included) against the blob at `HEAD:<vault-relative path>`. Line breaks are compared as `\n` (CodeMirror already normalises the document; split the HEAD text on `/\r?\n/`), so a CRLF checkout doesn't mark every line.
4. **Markers** (from `Chunk.build(headText, doc)`), in a gutter of their own, **immediately left of the text** (after line numbers and fold markers when those show):
   - **Added** (`fromA === toA`): a 3px bar in `var(--moss)` on each line `fromB…toB`.
   - **Changed** (both sides non-empty): a 3px bar in `var(--link)` on each line of `fromB…toB`.
   - **Deleted** (`fromB === toB`): a small right-pointing wedge in `var(--danger)` (about 6px tall, CSS triangle) at the top edge of the line after the deletion, or at the bottom edge of the last line when the deletion is at the end of the file.
   - The bars are flat, with no rounding or glow, and fill the line block's full height, so a heading line or wrapped line gets one continuous bar.
5. **New and untracked files.** A path missing from HEAD's tree, or a repo with no commits yet (HEAD's ref missing), marks every non-empty line as added. `.gitignore` is not read (see Out of scope).
6. **Binary or huge.** A HEAD blob with a NUL byte in its first 8 KB, or larger than 2 MB, or a document over 20,000 lines: no markers for that file.
7. **Live updates.** Markers recompute 150 ms after the last edit. Typing never waits for them: the diff is cheap, but it runs in the debounce, outside the transaction.
8. **When HEAD moves** (a commit, checkout or pull in a terminal): the commit is re-resolved when the window regains focus, when the page becomes visible, and every 5 s while the window is focused and the gutter is showing. The check costs one read of `.git/HEAD` plus the resolved ref's file `lastModified`, or `packed-refs`. The blob is re-read only when the commit id changed.
9. **Failure is silent.** A corrupt object, a missing pack or a permission error shows no markers for that file, logs one `console.warn` per file and commit, and never shows a toast or blocks the editor. Turning the toggle on in a vault that isn't a repo shows no markers. The palette command's `description` reads "No .git folder at the vault's root" in that case, so the user can see why.
10. **Unchanged.** Saving, the file watcher, conflict handling, the vault scan (still skips `.git`), browser vaults, drafts and mobile all behave as before.

## Design

### Reading git: `app/services/git/` (pure, no React)

| File | Exports | Notes |
|---|---|---|
| `git-refs.ts` | `resolveHead(gitDir): Promise<{ commit: string \| null; stamp: string }>` | `HEAD` is either `ref: refs/heads/x` or a 40-hex id. A ref is read from `refs/...` first, then `packed-refs` (skip `#` and `^` lines). `stamp` = HEAD text + ref file `lastModified` (or packed-refs `lastModified`), so callers cheaply detect a move. `commit: null` = no commits yet |
| `git-objects.ts` | `readObject(gitDir, id): Promise<{ type; data: Uint8Array }>` | Loose `objects/aa/bbbb…` → `unzlibSync`, strip the `"<type> <size>\0"` header. Otherwise search packs (below). An immutable LRU cache keyed by id (≤ 64 objects, ≤ 16 MB total) |
| `git-pack.ts` | `findInPacks(gitDir, id)`, `readPackEntry(pack, offset)`, `applyDelta(base, delta)` | `objects/pack/*.idx` v2: magic `\377tOc`, version 2, 256×4 fanout, sorted 20-byte ids, CRCs, 4-byte offsets (MSB set → index into the 8-byte large-offset table). Each parsed idx is cached per pack name + `lastModified`, and a binary search finds the id. A pack entry has a 3-bit type plus a varint size. `OFS_DELTA` (6) uses the negative-offset varint, `REF_DELTA` (7) a 20-byte base id via `readObject`. Inflate with streaming `Unzlib` over `file.slice(offset, offset + window)`, doubling the window (starting at 64 KB) until the inflated length reaches the entry size. **Never load a whole pack into memory.** `applyDelta`: source and target size varints, copy ops (`0x80` bit, offset/size bytes, size 0 → 0x10000) and insert ops (1–127 literal bytes). Chains resolve recursively, with a depth limit of 50 |
| `git-tree.ts` | `blobAtPath(gitDir, commitId, path): Promise<Uint8Array \| null>` | The commit's `tree <id>` line, then each path segment through the tree entries (`<mode> <name>\0<20 raw bytes>`). Returns null when the path is missing or not a blob |
| `git-repo.ts` | `openRepo(vault): Promise<GitRepo \| null>` | `vault.getDirectoryHandle(".git")` (a `TypeMismatchError` or `NotFoundError` → null). Read `config`, and return null when it has `objectformat = sha256` |

Each file stays well under 400 lines. All of it is plain TypeScript over `FileSystemDirectoryHandle`, so it runs in a worker unchanged.

### Worker: `workers/git-read.worker.ts` + `workers/git-read-protocol.ts`

- in: `{ type: "git:head", requestId, vault }` → out `{ requestId, available: boolean, commit, stamp }`
- in: `{ type: "git:blob", requestId, vault, commit, path }` → out `{ requestId, status: "ok" | "missing" | "binary" | "too-large" | "error", text? }`. The worker decodes UTF-8 (`TextDecoder` with `fatal: false`) and runs the NUL / 2 MB checks.
- The worker keeps the caches (repo per vault handle, idx files, objects), so several panes and repeated checks share them.

Inflating pack windows can take tens of milliseconds on big repos. In the worker it never blocks typing ("background work never blocks").

### Client: `services/git-read-client.ts`

`getHead(vault)` and `getHeadBlob(vault, commit, path)` return promises. The worker is created on first use, like `text-grep-client.ts`. In-flight requests for the same `(vault, commit, path)` are deduplicated. When `Worker` is missing (tests, old browsers), the client calls the `services/git/` functions directly.

### Editor: `editor/codemirror/git-changes.ts`

```ts
/** HEAD's text for this file, or null for "no baseline" (all lines added). */
export const setGitBaseline: StateEffectType<{ text: string | null } | "off">;
export function gitChanges(): Extension;
// StateField<{ base: Text | null | "off"; markers: RangeSet<GutterMarker> }>
//  - setGitBaseline updates base and recomputes markers immediately
//  - docChanged maps markers through the changes (positions stay right while typing);
//    a ViewPlugin debounces 150 ms, then dispatches a recompute effect
// gutter({ class: "cm-gitChanges", markers: v => v.state.field(f).markers }) + theme
export function computeGitMarkers(base: Text | null, doc: Text): RangeSet<GutterMarker>;
```

- `computeGitMarkers` is pure: `Chunk.build` → added / changed / deleted markers per Behavior 4. A null base marks every non-empty line as added. Skip it (empty set) over 20,000 lines.
- Three `GutterMarker` singletons, with classes `cm-git-added`, `cm-git-changed` and `cm-git-deleted` (the deleted one also takes `-end` for an end-of-file deletion). The theme draws the bar with a `::before` pseudo-element, with `width: 3px; height: 100%` and the colour vars, and the wedge with borders. The gutter is 6px wide with no padding.
- Gutter order: put `gitChanges()` in the extension array **after** the line-numbers compartment and `codeGutters`, so CodeMirror places it next to the text.

### Wiring

- `atoms/git-atoms.ts` (new): `export const atom_showGitChanges = atomWithStorage<boolean>("showGitChanges", false);` with a comment in the style of `ui-atoms.ts`. Re-export it from `atoms/atoms.ts` (`export * from "./git-atoms";`, next to `./ui-atoms` at `:5`).
- `BuildExtensionsOptions` gets `gitChanges: boolean` and `gitChangesCompartment: Compartment`. Both `buildExtensions` and `buildPlainTextExtensions` add `opts.gitChangesCompartment.of(opts.gitChanges ? gitChanges() : [])`. `use-codemirror-editor.ts` creates the compartment and reconfigures it in an effect, like invisibles (`:211-216`).
- `editor/hooks/use-git-baseline.ts` (new): `useGitBaseline({ viewRef, filePath, enabled })`.
  - `enabled` = setting on && `vaultDescriptor?.kind === "local"` && `filePath !== "draft"`.
  - On enable or a path change: `getHead`. If unavailable, set `atom_gitAvailable` (a plain atom in `git-atoms.ts`) to false and stop. Otherwise call `getHeadBlob` and dispatch `setGitBaseline` with `{ text }` for `ok`, `{ text: null }` for `missing`, and `"off"` for binary, too-large or error.
  - Re-check per Behavior 8, with `focus` and `visibilitychange` listeners plus a 5 s interval only while `document.hasFocus()`. Compare `stamp` and refetch only on a change. Clear everything on unmount, disable or path change.
  - Ignore a stale response when the path or commit moved on, by keeping a request token in a ref.
- `MarkdownEditor.tsx`: read `atom_showGitChanges`, pass `gitChanges` to `useCodeMirrorEditor`, and call `useGitBaseline`. This adds about 4 lines, keeping the file under 400.
- `SettingsCommands.tsx`: `{ id: "toggle-git-changes", label: "Toggle Git Changes", category: "Settings", keywords: "git diff changes gutter modified added deleted repository commit head", description: gitAvailable === false ? "No .git folder at the vault's root" : undefined, action: … }`.
- `EditorSettings.tsx` View group: a `SettingItem` "Git Changes" with the description "In a disk vault that's a git repository, mark lines added, changed or deleted since the last commit in the gutter." Use `Toggle variant="soft"`, like Outline. Update the header comment (`:12-14`).

## Phases

1. **Git reader.** Build `services/git/*` with its tests, plus the worker, protocol and client. Add the `@codemirror/merge` dependency (latest 6.x, exact version in `package.json`, `yarn.lock` updated).
2. **Gutter.** Build `git-changes.ts` with tests, the compartment wiring in both extension builders and in `use-codemirror-editor.ts`.
3. **Toggle and baseline.** Add `git-atoms.ts`, `use-git-baseline.ts` with tests, the MarkdownEditor wiring, the palette command and the settings item.
4. **Docs** (below).

## Tests

All tests mock the worker and the file system (AGENT_RULES "100% Mocking"). Use `MemoryDirectoryHandle` / `MemoryFileHandle` from `services/memory-file-system.test-utils.ts` (`:32,62`) for directory handles.

- `services/git/git-refs.test.ts`: a symbolic HEAD with a loose ref; a symbolic HEAD found only in `packed-refs` (with `#` and `^` lines); a detached HEAD; a missing ref → `commit: null`; `stamp` changes when the ref file changes.
- `services/git/git-objects.test.ts` + `git-pack.test.ts`: a test helper builds objects with `fflate.zlibSync` and the git header. A small pack + v2 idx writer in `git-test-utils.ts` covers a plain blob, an `OFS_DELTA` blob, a `REF_DELTA` blob and a large-offset idx entry. Check that `applyDelta` handles copy (including size 0 → 0x10000) and insert ops. An entry longer than the first window still inflates. An unknown id → throws `NotFound`.
- `services/git/git-tree.test.ts`: a nested path resolves; a missing segment → null; a path naming a tree → null.
- `services/git/git-repo.test.ts`: no `.git` → null; `.git` as a file → null; sha256 config → null.
- `editor/codemirror/git-changes.test.ts` (pure `computeGitMarkers`): add, change, delete-in-middle, delete-at-end (`-end` class), a null base (all non-empty lines added), identical text → empty set, over 20,000 lines → empty set, and a CRLF base equal to the LF doc → empty set.
- `editor/hooks/use-git-baseline.test.ts` (mocked client, fake timers): enabled → baseline dispatched; unavailable → `atom_gitAvailable` false and no dispatch; a focus event with a changed stamp → refetch, and with the same stamp → none; a stale response after a path change is ignored; disabled → nothing.
- `SettingsCommands` and `EditorSettings` tests: the toggle flips `atom_showGitChanges`, and the description shows when `atom_gitAvailable` is false.

## Docs

- `documentation/content/vault.tsx` `git` section: the lead becomes "HermesMarkdown doesn't run git: commit, pull and push with the tools you already use. It can show what changed since your last commit." Add a paragraph on Git Changes covering what the bars mean, that `.git` must be at the vault root, and that the app only reads it. Add `diff changes gutter` to its keywords.
- `documentation/content/editor-workspace.tsx:280`: add "Git Changes" to the toggle list.
- `components/LandingPage/landing-content.ts:45,68`: keep "commit with the tools you already use", and add that changed lines are marked in the gutter. Don't name other editors or products anywhere.
- Component docs: `EditorSettings.md`, `SettingsCommands.md`, `MarkdownEditor.md` (new hook and prop), `editor/codemirror/README.md` (`git-changes.ts`), `editor/hooks/README.md` (`use-git-baseline.ts`), `workers/README.md` (git-read worker and protocol), `services` README (git reader and client), `atoms/README.md` (`git-atoms.ts`).

## Acceptance criteria

- [ ] With Git Changes on, in a disk vault whose root has `.git`, opening a tracked file that differs from HEAD shows moss bars on added lines, link-blue bars on changed lines and a danger-colour wedge where lines were deleted.
- [ ] Typing updates the markers within about 150 ms of the last keystroke, with no input lag. Undo back to HEAD's text clears them.
- [ ] Committing in a terminal, then focusing the window, clears the markers for the committed file within one check.
- [ ] Untracked files, and repos with no commits, show every non-empty line as added.
- [ ] A packed object (after `git gc`), including a delta chain, gives the same markers as a loose one.
- [ ] Browser vaults, drafts, vaults without `.git` at the root, `.git` files, sha256 repos, binary or oversized blobs: no markers, no errors shown, no extra gutter width.
- [ ] Off by default. The toggle works from the palette and from Settings → Editor → View. The palette explains when the vault isn't a repo.
- [ ] Works the same in notes, with or without Line Numbers, and in code files, where it sits right of the numbers and fold markers.
- [ ] No writes to `.git`. Whole packs are never read into memory, and git reads run in a worker.
- [ ] Tests listed above pass in CI. Each new or changed source file is under 400 lines. `ui-atoms.ts` and `MarkdownEditor.tsx` stay under 400.
- [ ] User docs, landing copy and component docs updated.

## Decisions

- **Read `.git` ourselves rather than add `isomorphic-git`.** We need only read-only HEAD → tree → blob, which is about 400 lines over handles we already have. isomorphic-git is far larger and expects a Node-style `fs` adapter.
- **`@codemirror/merge` for the diff** (`Chunk.build` only). It is fast, time-limited, by the same author and works on `Text`. Writing our own Myers diff isn't worth it.
- **Compare against HEAD, not the index.** Gutter bars answer "what changed since my last commit". Staging is a git-tool concept the app doesn't show.
- **Unsaved edits count.** The bars describe what you see.
- **Colours from existing theme vars** (`--moss`, `--link`, `--danger`), not new tokens, and never the accent.
- **Poll the HEAD stamp every 5 s while focused, plus on focus and visibility.** This is cheap (two small reads), and `FileSystemObserver` on `.git` would fire constantly during git operations.

## Out of scope / Deferred

- An inline peek of the old lines, reverting a hunk, next/previous change navigation.
- Vaults inside a repo (`.git` above the vault root). That would need the user to pick the repo root separately.
- `.gitignore` (ignored files show as all-added), the index or staging state, other branches, blame, history.
- Worktrees and submodules (`.git` file), sha256 repositories, LFS pointers (they show as their pointer text).

## Open questions

- None blocking. The product owner may want a keyboard shortcut for the toggle; none is assigned here.
