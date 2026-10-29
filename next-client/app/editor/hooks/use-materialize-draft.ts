"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import {
  atom_isVaultPending,
  atom_isVaultRestoring,
  atom_liveHandles,
  atom_materializeDraft,
  atom_openFiles,
  atom_vaultHandle,
  atom_workspaceLayout,
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

// Saves the draft into the vault's New Files folder (no dialog), named
// after its first line (see draftTitle). Typed text is never lost or
// overwritten onto another note: a taken name gets ` (1)`. The draft tab
// then becomes that file in place. Whitespace-only drafts are never written.
// Resolves to the new vault path, or null when nothing was saved.
export function useMaterializeDraft({ scanVault, indexVaultTags }: UseMaterializeDraftOptions) {
  const store = useStore();

  return useCallback(async (_paneId?: string): Promise<string | null> => {
    if (inFlight) return inFlight;

    // A restored draft waits until the vault is readable (startup, or
    // waiting on "Restore Access").
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle || store.get(atom_isVaultRestoring) || store.get(atom_isVaultPending)) return null;

    const leaf = store.get(atom_workspaceLayout).rootContainer;
    if ((leaf.activeFilePath || "draft") !== "draft") return null;

    if (!store.get(atom_openFiles).draft?.content.trim()) return null;

    inFlight = (async () => {
      try {
        const folderPath = normalizeFolderPath(store.get(atom_newNoteFolder));
        const content = store.get(atom_openFiles).draft?.content ?? "";
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
        toast.error("Couldn't save the file to the vault. Your text is kept in this draft.");
        return null;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }, [store, scanVault, indexVaultTags]);
}
