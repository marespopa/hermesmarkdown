# editor/changes

The Changes page (`/editor/changes`, palette: **Show Changes**): every file of a disk vault that differs from HEAD, with its unified diff, read-only. The scan (`services/git/git-changes-scan.ts`) runs in `workers/git-changes.worker.ts` through `services/git-changes-client.ts`.

| File | Role |
|---|---|
| `page.tsx` | The page in `ShellPage`: states (no vault, a restored vault waiting for access (`atom_isVaultPending`: no scan until it's allowed), a browser vault, no `.git` at the vault root (named, since a subfolder opened as the vault is the usual cause), no changes, read error with **Try Again** and the error's name and message), `LoadingBar` ("Checking changes") and the page's skeleton (`ChangesBodySkeleton`) under a status line: "Reading the repository…", then "Listing files… N found", then "Checking N of M files…" while there is no result yet, the summary and one `FileDiffSection` per file. Collapse state is page-local (what the user toggled, by path, over `initialCollapsed`) |
| `use-git-changes.ts` | `useGitChanges(vault, enabled)`: starts a scan on mount, window focus and when the page becomes visible (one rescan queued during a scan), cancels on leave or vault change, ignores stale results, seeds from `atom_gitChangesCache` for the same vault, or after a reload from the result saved for the vault (`services/changes-cache.ts`, saved after each scan); passes the handles the vault index already has (`atom_fileMetadata`, `atom_vaultTextFiles`) so tracked notes are checked first; `found`: the running scan's changed files so far, sorted by path, which the page shows (under the status line) when there's no result to show yet |
| `use-open-change.ts` | Opens a changed file at a line: fresh handle, `openFile`, `atom_pendingScrollTarget`, `router.push`; a toast when the file is gone |
| `diff-layout.ts` | Pure: `layoutDiff` (3 lines of context, folded gaps), `firstChangeLine`, `rowCount`, `initialCollapsed` (over 400 rows collapsed; expanded rows capped at 3,000) |
| `diff-classes.ts` | The tint and sign classes, mirroring the editor's inline diff theme |
| `components/ChangesSummary.tsx` | Counts, Collapse All / Expand All, the file list |
| `components/FileDiffSection.tsx` | One file: sticky header and diff, or a message |
| `components/DiffLines.tsx` | The rows of a diff; one delegated click handler |
