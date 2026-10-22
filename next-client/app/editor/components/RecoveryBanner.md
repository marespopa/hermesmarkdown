# RecoveryBanner

One floating line above the editor content while something keeps notes from being saved. Mounted by `EditorShell` once the vault is unlocked; renders nothing when all is well.

## State

- `atom_recoveryIssue` (`app/atoms/recovery-atoms.ts`): the issue to show. Set through `reportRecoveryIssue()` (a vault issue outranks a storage one) and cleared with `clearRecoveryIssue(...kinds)`.
- `atom_isActiveNoteLarge` (local derived atom): the note in front is over `LARGE_NOTE_CHARS`. Only flips at the limit, so typing doesn't re-render the banner.
- Local `dismissedLarge`: paths whose large-note line was dismissed this session.

## What shows

| Issue | Reported by | Message | Actions |
|-------|-------------|---------|---------|
| `access-lost` | `useSaveFile` (permission not granted, `NotAllowedError`), `checkVaultHealth` | Hermes lost access to the vault; edits are held in memory | **Grant access again** (`restoreVault`, then saves every open note with unsaved changes), **Export note as .md** |
| `vault-missing` | `checkVaultHealth` (on every vault sync: focus, timer, folder watcher, a dropped observation) and a save's `NotFoundError` | The vault folder was moved or deleted | **Export note as .md**, **Choose folder** (`openVault`) |
| `storage-full` | the `openFiles` localStorage writer and `useSaveFile` on `QuotaExceededError` | Browser storage is full | **Export note as .md**, **Clear cache** |
| `storage-low` | `useRecoveryActions` on mount (`storage.estimate()` ≥ `STORAGE_LOW_RATIO`) | Browser storage is N% full | Export, Clear cache, dismiss |
| (none, large note) | — | The note is very large, so typing may lag | dismiss |

The issue clears itself when the next save or health check succeeds. **Clear cache** clears the vault metadata caches (`clearAllMetadataCaches`), the one thing Hermes stores that it can rebuild; vaults are indexed again on their next open.

## Logic

Button handlers come from `editor/hooks/use-recovery-actions.ts`. Export goes through `downloadMarkdown` and never touches the vault or the note's saved state.
