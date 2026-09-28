"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import {
  atom_activePaneId,
  atom_liveHandles,
  atom_materializeDraft,
  atom_openFiles,
  atom_vaultHandle,
  atom_workspaceLayout,
  findLeaf,
  getFirstLeaf,
} from "@/app/atoms/atoms";
import { atom_draftFolderDeclined, atom_draftFolderRequest, atom_newNoteFolder } from "@/app/atoms/ui-atoms";
import { withRetry } from "@/app/hooks/file-system/shared";
import { createUniqueFile, ensureVaultFolder, listVaultFolders, normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { writeFileContent } from "@/app/services/file-writer";
import { draftTitle } from "../utils/draft-title";

type Store = ReturnType<typeof useStore>;

interface UseMaterializeDraftOptions {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: () => Promise<void>;
}

// One save at a time per window: autosave, blur and Cmd+S can all fire while
// a write is in flight, and each must not create its own file.
let inFlight: Promise<string | null> | null = null;

export interface MaterializeDraftOptions {
  /** Autosave / window blur: don't ask again once the picker was dismissed. */
  background?: boolean;
}

// Saves the draft into the vault: asks which folder (the "new notes" folder
// preselected), names it after its first line (see draftTitle), never
// overwrites. The draft tab then becomes that file in place. Whitespace-only
// drafts are never written. Resolves to the new vault path, or null when
// nothing was saved (including when the picker is dismissed).
export function useMaterializeDraft({ scanVault, indexVaultTags }: UseMaterializeDraftOptions) {
  const store = useStore();

  return useCallback(async (paneId?: string, { background = false }: MaterializeDraftOptions = {}): Promise<string | null> => {
    if (inFlight) return inFlight;

    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return null;

    const root = store.get(atom_workspaceLayout).rootContainer;
    const leaf = findLeaf(root, paneId ?? store.get(atom_activePaneId)) ?? getFirstLeaf(root);
    if ((leaf.activeFilePath || "draft") !== "draft") return null;

    if (!store.get(atom_openFiles).draft?.content.trim()) return null;
    if (background && store.get(atom_draftFolderDeclined)) return null;

    inFlight = (async () => {
      try {
        const folderPath = await askFolder(store, vaultHandle);
        if (folderPath === null) {
          store.set(atom_draftFolderDeclined, true);
          return null;
        }
        store.set(atom_draftFolderDeclined, false);
        // Text typed while the picker was opening belongs in the file too.
        const content = store.get(atom_openFiles).draft?.content ?? "";
        if (!content.trim()) return null;
        const folder = await ensureVaultFolder(vaultHandle, folderPath);
        const { handle, fileName } = await createUniqueFile(folder, draftTitle(content, new Date()));
        await withRetry(() => writeFileContent(handle, content));

        let lastModified: number | undefined;
        try {
          lastModified = (await handle.getFile()).lastModified;
        } catch {
          // The file watcher picks the timestamp up on its next pass.
        }

        const path = folderPath ? `${folderPath}/${fileName}` : fileName;
        store.set(atom_liveHandles(path), handle);
        store.set(atom_materializeDraft, { paneId: leaf.id, path, fileName, savedContent: content, lastModified });
        toast.success(`Saved as ${fileName}`, { id: "draft-saved" });

        void scanVault(vaultHandle).then(() => indexVaultTags());
        return path;
      } catch (err: any) {
        console.warn("Failed to save draft:", err?.message || err);
        toast.error("Couldn't save the note to the vault. Your text is kept in this draft.");
        return null;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }, [store, scanVault, indexVaultTags]);
}

// Resolves to the chosen vault-relative folder ("" = root), or null.
async function askFolder(store: Store, vaultHandle: FileSystemDirectoryHandle): Promise<string | null> {
  const defaultFolder = normalizeFolderPath(store.get(atom_newNoteFolder));
  let folders: string[] = [];
  try {
    folders = await listVaultFolders(vaultHandle);
  } catch {
    // Still offer the root and the default folder.
  }
  if (defaultFolder && !folders.includes(defaultFolder)) folders = [defaultFolder, ...folders];
  const choice = await new Promise<string | null>((resolve) => {
    store.set(atom_draftFolderRequest, {
      folders,
      defaultFolder,
      resolve: (folder) => {
        store.set(atom_draftFolderRequest, null);
        resolve(folder);
      },
    });
  });
  return choice === null ? null : normalizeFolderPath(choice);
}
