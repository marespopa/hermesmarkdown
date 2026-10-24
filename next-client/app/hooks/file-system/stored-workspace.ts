// Finds the vault to reopen on mount when it lives in browser storage (a
// browser vault). Disk vaults are restored separately because they need a
// permission check first.
import type { VaultDescriptor } from "@/app/atoms/atoms";
import { loadBrowserVaultDescriptor } from "@/app/services/idb";
import { getBrowserVaultWorkspace } from "@/app/services/opfs";

export interface StoredWorkspace {
  handle: FileSystemDirectoryHandle;
  descriptor: Exclude<VaultDescriptor, { kind: "local" }>;
}

// Saving one vault kind clears the other, so at most one of these is set.
export async function loadStoredWorkspace(): Promise<StoredWorkspace | null> {
  const browserDescriptor = await loadBrowserVaultDescriptor();
  if (!browserDescriptor) return null;
  return { handle: await getBrowserVaultWorkspace(browserDescriptor), descriptor: browserDescriptor };
}
