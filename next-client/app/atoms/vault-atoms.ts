import { atom } from "jotai";
import { atom_openFiles, atom_liveHandles } from "./file-atoms";
import { atom_workspaceLayout } from "./workspace-atoms";
import { removePathsFromLayout } from "./utils";

// Vault / Local File System
export const atom_vaultHandle = atom<FileSystemDirectoryHandle | null>(null);
export const atom_currentDirectoryHandle =
  atom<FileSystemDirectoryHandle | null>(null);

export const atom_vaultFiles = atom<FileSystemHandle[]>([]);
export const atom_isVaultPending = atom<boolean>(false);
export const atom_hasLoadedVault = atom<boolean>(false);
export const atom_isCloudVault = atom<boolean>(false);
export const atom_fileSystemVersion = atom<number>(0);

export type VaultSetupStatus = 'idle' | 'checking' | 'needs_setup' | 'configured' | 'skipped';
export const atom_vaultSetupStatus = atom<VaultSetupStatus>('idle');

// Action atoms
export const atom_rebindHandles = atom(
  null,
  async (get, set, vaultHandle: FileSystemDirectoryHandle) => {
    const openFiles = get(atom_openFiles);
    const paths = Object.keys(openFiles);
    const missingPaths: string[] = [];

    for (const path of paths) {
      if (path === "draft") continue;

      try {
        const parts = path.split("/");
        let current: any = vaultHandle;

        // Walk the directory structure
        for (let i = 0; i < parts.length - 1; i++) {
          current = await current.getDirectoryHandle(parts[i]);
        }

        // Get the file handle
        const handle = await current.getFileHandle(parts[parts.length - 1]);
        if (handle) {
          set(atom_liveHandles(path), handle);
        }
      } catch (err: any) {
        console.warn(`Failed to rebind handle for ${path}:`, err);
        // The file is gone (deleted outside the app, on another device,
        // etc.) rather than just transiently unreachable — close its tab
        // instead of leaving it open and pointing at nothing.
        if (err?.name === "NotFoundError") {
          missingPaths.push(path);
        }
      }
    }

    if (missingPaths.length > 0) {
      const isMissing = (p: string) => missingPaths.includes(p);
      set(atom_workspaceLayout, (prev) => ({
        ...prev,
        rootContainer: removePathsFromLayout(prev.rootContainer, isMissing) as typeof prev.rootContainer,
      }));
      set(atom_openFiles, (prev) => {
        const next = { ...prev };
        for (const p of missingPaths) delete next[p];
        return next;
      });
    }
  },
);
