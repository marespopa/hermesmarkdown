// Vaults opened on this device, most recent first, for the Home feed's vault
// switcher and its no-vault start screen. Kept in IndexedDB because a disk
// vault's entry holds its folder handle, which localStorage can't store.
import type { GitHubVaultDescriptor } from "./github-vault-workspace";
import type { BrowserVaultDescriptor } from "./opfs";
import { readKey, writeKey } from "./idb";

const KEY_RECENT_VAULTS = "recentVaults";

export const MAX_RECENT_VAULTS = 8;

interface RecentVaultBase {
  /** The vault's `atom_vaultKey`. */
  key: string;
  name: string;
  openedAt: number;
}

export type RecentVault =
  | (RecentVaultBase & { kind: "local"; handle: FileSystemDirectoryHandle })
  | (RecentVaultBase & { kind: "browser"; descriptor: BrowserVaultDescriptor })
  | (RecentVaultBase & { kind: "github"; descriptor: GitHubVaultDescriptor });

// Puts `entry` first, dropping an older entry for the same vault, and keeps
// at most `max`.
export function addRecentVault(list: readonly RecentVault[], entry: RecentVault, max = MAX_RECENT_VAULTS): RecentVault[] {
  return [entry, ...list.filter((item) => item.key !== entry.key)].slice(0, max);
}

export function removeRecentVault(list: readonly RecentVault[], key: string): RecentVault[] {
  return list.filter((item) => item.key !== key);
}

function isRecentVault(value: any): value is RecentVault {
  if (!value || typeof value.key !== "string" || typeof value.name !== "string") return false;
  if (value.kind === "local") return !!value.handle;
  return (value.kind === "browser" || value.kind === "github") && !!value.descriptor;
}

const isSupported = () => typeof window !== "undefined" && !!window.indexedDB;

export async function loadRecentVaults(): Promise<RecentVault[]> {
  if (!isSupported()) return [];
  try {
    const list = await readKey<unknown>(KEY_RECENT_VAULTS);
    return Array.isArray(list) ? list.filter(isRecentVault) : [];
  } catch (err) {
    console.warn("Failed to load recent vaults from IDB:", err);
    return [];
  }
}

export async function saveRecentVaults(list: readonly RecentVault[]): Promise<void> {
  if (!isSupported()) return;
  try {
    await writeKey(KEY_RECENT_VAULTS, list);
  } catch (err) {
    console.warn("Failed to save recent vaults to IDB:", err);
  }
}
