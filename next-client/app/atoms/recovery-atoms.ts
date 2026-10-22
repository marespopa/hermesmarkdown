import { atom, getDefaultStore } from "jotai";

// Something that stops notes reaching disk or browser storage, shown by
// RecoveryBanner above the editor until it clears. The open notes' text stays
// in memory either way, and the banner offers a way to export it.
// - access-lost: the browser no longer lets Hermes write to the vault folder.
// - vault-missing: the vault folder was deleted or moved outside Hermes.
// - storage-full: a write to browser storage failed for lack of room.
// - storage-low: browser storage is nearly full (warned on load).
export type RecoveryIssue =
  | { kind: "access-lost" }
  | { kind: "vault-missing" }
  | { kind: "storage-full" }
  | { kind: "storage-low"; usage: number; quota: number };

export const atom_recoveryIssue = atom<RecoveryIssue | null>(null);

// Notes longer than this (characters) get a one-line note that the editor may slow down.
export const LARGE_NOTE_CHARS = 1_000_000;

// The share of browser storage in use that counts as nearly full.
export const STORAGE_LOW_RATIO = 0.9;

// Which issue wins when two are reported: losing the vault outranks storage.
const PRIORITY: Record<RecoveryIssue["kind"], number> = {
  "vault-missing": 3,
  "access-lost": 2,
  "storage-full": 1,
  "storage-low": 0,
};

// Records an issue unless a more serious one is already showing. Module
// level, so storage code outside React (the debounced localStorage writer)
// can report too.
export function reportRecoveryIssue(issue: RecoveryIssue): void {
  const store = getDefaultStore();
  const current = store.get(atom_recoveryIssue);
  if (current && PRIORITY[current.kind] > PRIORITY[issue.kind]) return;
  store.set(atom_recoveryIssue, issue);
}

// Clears the issue if it is one of `kinds` (a recovered vault doesn't clear
// a storage warning, and the other way round).
export function clearRecoveryIssue(...kinds: RecoveryIssue["kind"][]): void {
  const store = getDefaultStore();
  const current = store.get(atom_recoveryIssue);
  if (current && kinds.includes(current.kind)) store.set(atom_recoveryIssue, null);
}

export function isQuotaError(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}
