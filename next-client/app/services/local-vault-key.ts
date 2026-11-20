import { loadRecentVaults, type RecentVault } from "./recent-vaults";

// A disk vault's key (atom_vaultKey): `local:<folder name>`, and for a second
// folder with the same name `local:<name>~2`, `~3`…, so two vaults never share
// their saved tabs, tree state or pins. A folder already in the recents keeps
// the key it has there (matched with isSameEntry), so keys saved before this
// existed stay valid.
export async function resolveLocalVaultKey(
  handle: FileSystemDirectoryHandle,
  recents?: RecentVault[],
): Promise<string> {
  const list = recents && recents.length > 0 ? recents : await loadRecentVaults().catch(() => [] as RecentVault[]);
  const locals = list.filter((entry): entry is Extract<RecentVault, { kind: "local" }> => entry.kind === "local");
  for (const entry of locals) {
    try {
      if (await entry.handle.isSameEntry(handle)) return entry.key;
    } catch {
      // A handle the browser can't compare is treated as a different folder.
    }
  }
  const taken = new Set(list.map((entry) => entry.key));
  const base = `local:${handle.name}`;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    if (!taken.has(`${base}~${n}`)) return `${base}~${n}`;
  }
}
