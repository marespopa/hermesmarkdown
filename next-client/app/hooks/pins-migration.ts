// Pinned notes from before the vault's pins file: kept per device in
// localStorage, keyed by vault (atom_vaultKey), newest pin first. usePinsSync
// moves each vault's list into its `.hermes/pins.yaml` once, then forgets it.
// The key's name is from when notes were pinned to the old home feed.
export const LEGACY_NOTE_PINS_KEY = "hermes_home_pins";

function readStore(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(LEGACY_NOTE_PINS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// The vault's legacy pinned note paths, in their stored order; [] on anything odd.
export function readLegacyNotePins(vaultKey: string): string[] {
  const paths = readStore()?.[vaultKey];
  return Array.isArray(paths) ? paths.filter((path): path is string => typeof path === "string" && !!path) : [];
}

// Deletes the vault's entry; removes the storage key once it's empty.
export function forgetLegacyNotePins(vaultKey: string): void {
  const stored = readStore();
  if (!stored || !(vaultKey in stored)) return;
  delete stored[vaultKey];
  try {
    if (Object.keys(stored).length === 0) localStorage.removeItem(LEGACY_NOTE_PINS_KEY);
    else localStorage.setItem(LEGACY_NOTE_PINS_KEY, JSON.stringify(stored));
  } catch {
    // Storage blocked: the entry is read again next time, and adds nothing new.
  }
}
