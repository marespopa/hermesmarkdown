import { readKey, writeKey, deleteKeys } from "./idb";
import type { WorkspaceState } from "@/app/types/workspace";
import type { FileState } from "@/app/atoms/file-atoms";

// What a vault looks like when you leave it: its tabs, their text, and the
// sidebar sections folded. Kept per vault (its key, atom_vaultKey) so
// switching back restores it. The folder's files are re-read from disk on
// restore (rebindHandles), so the disk wins over this text.
export interface VaultWorkspaceSnapshot {
  layout: WorkspaceState;
  openFiles: Record<string, FileState>;
  sidebarCollapsed: Record<string, boolean>;
}

const keyFor = (vaultKey: string) => `workspace:${vaultKey}`;

function isSnapshot(value: unknown): value is VaultWorkspaceSnapshot {
  const snapshot = value as Partial<VaultWorkspaceSnapshot> | null;
  return !!snapshot && typeof snapshot === "object"
    && !!snapshot.layout?.rootContainer
    && !!snapshot.openFiles && typeof snapshot.openFiles === "object";
}

export async function saveVaultWorkspace(vaultKey: string, snapshot: VaultWorkspaceSnapshot): Promise<void> {
  try {
    await writeKey(keyFor(vaultKey), snapshot);
  } catch (err) {
    console.warn("Failed to save the vault's workspace:", err);
  }
}

export async function loadVaultWorkspace(vaultKey: string): Promise<VaultWorkspaceSnapshot | null> {
  try {
    const stored = await readKey<unknown>(keyFor(vaultKey));
    return isSnapshot(stored) ? { ...stored, sidebarCollapsed: stored.sidebarCollapsed ?? {} } : null;
  } catch {
    return null;
  }
}

export function forgetVaultWorkspace(vaultKey: string): Promise<void> {
  return deleteKeys([keyFor(vaultKey)]).catch(() => undefined);
}
