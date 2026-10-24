// Whether the last visit had a vault to restore, kept in localStorage so the
// next load knows at once, before IndexedDB answers: with none (a first-time
// user, or one who works in the draft), the editor shows straight away and
// the restore runs behind it; with one, the vault's skeleton stays up until
// it's readable, so no draft flashes first. Unknown (no hint yet) waits too.
const VAULT_HINT_KEY = "hermes:savedVault";

export type VaultHint = "none" | "saved" | null;

export function readVaultHint(): VaultHint {
  try {
    const value = localStorage.getItem(VAULT_HINT_KEY);
    return value === "none" || value === "saved" ? value : null;
  } catch {
    return null;
  }
}

export function writeVaultHint(hint: "none" | "saved"): void {
  try {
    localStorage.setItem(VAULT_HINT_KEY, hint);
  } catch {
    // Storage blocked (private mode): the next load just waits for IndexedDB.
  }
}
