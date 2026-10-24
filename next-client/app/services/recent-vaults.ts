// Vaults opened on this device, for the sidebar's vault switcher and its
// no-vault start screen: the pinned ones first, in the order the user gave
// them, then the rest, most recent first. Kept in IndexedDB because a disk
// vault's entry holds its folder handle, which localStorage can't store.
import type { BrowserVaultDescriptor } from "./opfs";
import { readKey, writeKey } from "./idb";

export const RECENT_VAULTS_KEY = "recentVaults";

// Unpinned entries kept; pinned ones never age out.
export const MAX_RECENT_VAULTS = 8;

interface RecentVaultBase {
  /** The vault's `atom_vaultKey`. */
  key: string;
  name: string;
  openedAt: number;
  /** Kept at the top of the list, where the user placed it. */
  pinned?: boolean;
  /** An emoji shown before the vault's name (the sidebar's switcher, the menu). */
  icon?: string;
}

export type RecentVault =
  | (RecentVaultBase & { kind: "local"; handle: FileSystemDirectoryHandle })
  | (RecentVaultBase & { kind: "browser"; descriptor: BrowserVaultDescriptor });

const pinnedOf = (list: readonly RecentVault[]) => list.filter((item) => item.pinned);
const unpinnedOf = (list: readonly RecentVault[]) => list.filter((item) => !item.pinned);

function withoutPin(entry: RecentVault): RecentVault {
  const copy = { ...entry };
  delete copy.pinned;
  return copy;
}

// Puts `entry` first among the unpinned, dropping an older entry for the same
// vault, and keeps at most `max` unpinned. A pinned vault stays pinned, in
// its place, and the vault's icon carries over (unless `entry` brings one).
export function addRecentVault(list: readonly RecentVault[], entry: RecentVault, max = MAX_RECENT_VAULTS): RecentVault[] {
  const existing = list.find((item) => item.key === entry.key);
  const icon = entry.icon ?? existing?.icon;
  const next = icon ? { ...entry, icon } : entry;
  if (existing?.pinned) return list.map((item) => (item.key === entry.key ? { ...next, pinned: true } : item));
  const rest = list.filter((item) => item.key !== entry.key);
  return [...pinnedOf(rest), ...[withoutPin(next), ...unpinnedOf(rest)].slice(0, max)];
}

// Pins an entry (last among the pinned) or unpins it (first among the rest).
export function setRecentVaultPinned(list: readonly RecentVault[], key: string, pinned: boolean): RecentVault[] {
  const entry = list.find((item) => item.key === key);
  if (!entry || !!entry.pinned === pinned) return [...list];
  const rest = list.filter((item) => item.key !== key);
  return pinned
    ? [...pinnedOf(rest), { ...entry, pinned: true }, ...unpinnedOf(rest)]
    : [...pinnedOf(rest), withoutPin(entry), ...unpinnedOf(rest)];
}

// Moves an entry to index `to`, kept within its own group (pinned or not).
export function moveRecentVault(list: readonly RecentVault[], key: string, to: number): RecentVault[] {
  const from = list.findIndex((item) => item.key === key);
  if (from === -1) return [...list];
  const pinnedCount = pinnedOf(list).length;
  const [start, end] = list[from].pinned ? [0, pinnedCount - 1] : [pinnedCount, list.length - 1];
  const next = [...list];
  const [entry] = next.splice(from, 1);
  next.splice(Math.max(start, Math.min(end, to)), 0, entry);
  return next;
}

// Sets an entry's emoji icon, or clears it with null.
export function setRecentVaultIcon(list: readonly RecentVault[], key: string, icon: string | null): RecentVault[] {
  return list.map((item) => {
    if (item.key !== key) return item;
    const copy = { ...item };
    if (icon) copy.icon = icon;
    else delete copy.icon;
    return copy;
  });
}

// Carries a renamed browser vault's new name into its entry, in place.
export function renameRecentBrowserVault(list: readonly RecentVault[], descriptor: BrowserVaultDescriptor): RecentVault[] {
  return list.map((item) =>
    item.kind === "browser" && item.descriptor.id === descriptor.id
      ? { ...item, name: descriptor.displayName, descriptor }
      : item);
}

export function removeRecentVault(list: readonly RecentVault[], key: string): RecentVault[] {
  return list.filter((item) => item.key !== key);
}

function isRecentVault(value: any): value is RecentVault {
  if (!value || typeof value.key !== "string" || typeof value.name !== "string") return false;
  if (value.kind === "local") return !!value.handle;
  return value.kind === "browser" && !!value.descriptor;
}

const isSupported = () => typeof window !== "undefined" && !!window.indexedDB;

export async function loadRecentVaults(): Promise<RecentVault[]> {
  if (!isSupported()) return [];
  try {
    const list = await readKey<unknown>(RECENT_VAULTS_KEY);
    if (!Array.isArray(list)) return [];
    const entries = list.filter(isRecentVault);
    return [...pinnedOf(entries), ...unpinnedOf(entries)];
  } catch (err) {
    console.warn("Failed to load recent vaults from IDB:", err);
    return [];
  }
}

export async function saveRecentVaults(list: readonly RecentVault[]): Promise<void> {
  if (!isSupported()) return;
  try {
    await writeKey(RECENT_VAULTS_KEY, list);
  } catch (err) {
    console.warn("Failed to save recent vaults to IDB:", err);
  }
}
