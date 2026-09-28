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
import { atom_newNoteFolder } from "@/app/atoms/ui-atoms";
import { withRetry } from "@/app/hooks/file-system/shared";
import { createUniqueFile, ensureVaultFolder, normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { writeFileContent } from "@/app/services/file-writer";
import { draftTitle } from "../utils/draft-title";

interface UseMaterializeDraftOptions {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: () => Promise<void>;
}

// One save at a time per window: autosave, blur and Cmd+S can all fire while
// a write is in flight, and each must not create its own file.
let inFlight: Promise<string | null> | null = null;

// Saves the draft into the vault without asking: named after its first line
// (see draftTitle), placed in the "new notes" folder, never overwriting. The
// draft tab then becomes that file in place. Whitespace-only drafts are never
// written. Resolves to the new vault path, or null when nothing was saved.
export function useMaterializeDraft({ scanVault, indexVaultTags }: UseMaterializeDraftOptions) {
  const store = useStore();

  return useCallback(async (paneId?: string): Promise<string | null> => {
    if (inFlight) return inFlight;

    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return null;

    const root = store.get(atom_workspaceLayout).rootContainer;
    const leaf = findLeaf(root, paneId ?? store.get(atom_activePaneId)) ?? getFirstLeaf(root);
    if ((leaf.activeFilePath || "draft") !== "draft") return null;

    const content = store.get(atom_openFiles).draft?.content ?? "";
    if (!content.trim()) return null;

    inFlight = (async () => {
      try {
        const folderPath = normalizeFolderPath(store.get(atom_newNoteFolder));
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
