// Finds the vault to reopen on mount when it lives in browser storage (a
// browser vault or a GitHub vault workspace). Disk vaults are restored
// separately because they need a permission check first.
import type { VaultDescriptor } from "@/app/atoms/atoms";
import { loadBrowserVaultDescriptor, loadGitHubVaultDescriptor } from "@/app/services/idb";
import { getBrowserVaultWorkspace } from "@/app/services/opfs";
import { getGitHubVaultWorkspace } from "@/app/services/github-vault-workspace";

export interface StoredWorkspace {
  handle: FileSystemDirectoryHandle;
  descriptor: Exclude<VaultDescriptor, { kind: "local" }>;
}

// Saving one vault kind clears the others, so at most one of these is set.
export async function loadStoredWorkspace(): Promise<StoredWorkspace | null> {
  const browserDescriptor = await loadBrowserVaultDescriptor();
  if (browserDescriptor) {
    return { handle: await getBrowserVaultWorkspace(browserDescriptor), descriptor: browserDescriptor };
  }

  const githubDescriptor = await loadGitHubVaultDescriptor();
  if (githubDescriptor) {
    return { handle: await getGitHubVaultWorkspace(githubDescriptor), descriptor: githubDescriptor };
  }

  return null;
}
