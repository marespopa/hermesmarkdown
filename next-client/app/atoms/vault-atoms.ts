import { atom } from "jotai";
import { atom_openFiles, atom_liveHandles } from "./file-atoms";

// Vault / Local File System
export const atom_vaultHandle = atom<FileSystemDirectoryHandle | null>(null);
export const atom_currentDirectoryHandle =
  atom<FileSystemDirectoryHandle | null>(null);

export const atom_vaultFiles = atom<FileSystemHandle[]>([]);
export const atom_isVaultPending = atom<boolean>(false);
export const atom_hasLoadedVault = atom<boolean>(false);
export const atom_isCloudVault = atom<boolean>(false);
export const atom_fileSystemVersion = atom<number>(0);

// Action atoms
export const atom_rebindHandles = atom(
  null,
  async (get, set, vaultHandle: FileSystemDirectoryHandle) => {
    const openFiles = get(atom_openFiles);
    const paths = Object.keys(openFiles);

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
      } catch (err) {
        console.warn(`Failed to rebind handle for ${path}:`, err);
      }
    }
  },
);
