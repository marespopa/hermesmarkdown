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
import { withRetry } from "@/app/hooks/file-system/shared";
import { useAskSaveFolder } from "@/app/hooks/file-system/use-ask-save-folder";
import { createUniqueFile, ensureVaultFolder } from "@/app/hooks/file-system/unique-file";
import { writeFileContent } from "@/app/services/file-writer";
import { draftTitle } from "../utils/draft-title";

interface UseMaterializeDraftOptions {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: () => Promise<void>;
}

// One save at a time per window: autosave, blur and Cmd+S can all fire while
// the folder question is open or a write is in flight, and each must not ask
// again or create its own file.
let inFlight: Promise<string | null> | null = null;

// Autosave asks once per draft: after a cancelled question it stays quiet
// until the draft is saved or emptied, so the dialog doesn't come back while
// typing goes on. A save the user asks for always asks.
let autoAskDeclined = false;

// Saves the draft into the vault folder the user picks (asked every time),
// named after its first line (see draftTitle). Typed text is never lost or
// overwritten onto another note: a taken name gets ` (1)`. The draft tab
// then becomes that file in place. Whitespace-only drafts are never written.
// Resolves to the new vault path, or null when nothing was saved (cancelling
// the question leaves the draft as it was). `auto` marks an autosave.
export function useMaterializeDraft({ scanVault, indexVaultTags }: UseMaterializeDraftOptions) {
  const store = useStore();
  const askSaveFolder = useAskSaveFolder();

  return useCallback(async (_paneId?: string, { auto = false }: { auto?: boolean } = {}): Promise<string | null> => {
    if (inFlight) return inFlight;

    // A restored draft waits until the vault is readable (startup, or
    // waiting on "Restore Access").
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle || store.get(atom_isVaultRestoring) || store.get(atom_isVaultPending)) return null;

    const leaf = store.get(atom_workspaceLayout).rootContainer;
    if ((leaf.activeFilePath || "draft") !== "draft") return null;

    const draftText = () => store.get(atom_openFiles).draft?.content ?? "";
    if (!draftText().trim()) {
      autoAskDeclined = false;
      return null;
    }
    if (auto && autoAskDeclined) return null;

    inFlight = (async () => {
      try {
        const folderPath = await askSaveFolder(`Save "${draftTitle(draftText(), new Date())}.md"`);
        if (folderPath === null) {
          if (auto) autoAskDeclined = true;
          return null;
        }
        autoAskDeclined = false;
        // Read after the question: text typed while it was open is saved too.
        const content = draftText();
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
        toast.error("Couldn't save the file to the vault. Your text is kept in this draft.");
        return null;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }, [store, askSaveFolder, scanVault, indexVaultTags]);
}
