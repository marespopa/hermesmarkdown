import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_newNoteFolder } from "@/app/atoms/ui-atoms";
import { ensureVaultFolder, normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { NEW_BOARD_MARKDOWN } from "@/app/utils/board/board-format";

type CreateFile = (name: string, content?: string, dirOverride?: FileSystemDirectoryHandle) => Promise<unknown>;

// "New board": `Untitled.board.md` in the New Notes folder (numbered
// `Untitled (1).board.md` on a clash by createUniqueFile). createFile opens
// it and shows its own success and error toasts.
export function useCreateBoard(createFile: CreateFile) {
  const store = useStore();
  return useCallback(async () => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return;
    try {
      const folder = await ensureVaultFolder(vaultHandle, normalizeFolderPath(store.get(atom_newNoteFolder)));
      await createFile("Untitled.board", NEW_BOARD_MARKDOWN, folder);
    } catch (err) {
      console.error("Failed to create board:", err);
      toast.error("Couldn't create the board.");
    }
  }, [createFile, store]);
}
