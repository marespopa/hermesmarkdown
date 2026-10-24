// The app's own file operations (rename, move, Trash, create, duplicate,
// undo) hold the background vault sync (useVaultSync) while they run and for
// a moment after: the folder watcher reports their changes as they happen,
// and a rescan and reindex of the whole vault in the middle of a rename
// slowed it down and could pull handles out from under it. Each operation
// rescans when it's done, so the skipped syncs aren't missed. Module level:
// useFileSystem runs in many components.
export const VAULT_SYNC_QUIET_MS = 1500;

let holds = 0;
let quietUntil = 0;

export async function holdVaultSync<T>(op: () => Promise<T>): Promise<T> {
  holds++;
  try {
    return await op();
  } finally {
    holds--;
    if (holds === 0) quietUntil = Date.now() + VAULT_SYNC_QUIET_MS;
  }
}

export function isVaultSyncHeld(): boolean {
  return holds > 0 || Date.now() < quietUntil;
}

// Tests only: no hold, no quiet window (the window outlives a test's clock).
export function resetVaultSyncHold(): void {
  holds = 0;
  quietUntil = 0;
}
