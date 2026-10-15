import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_newNoteFolder } from "@/app/atoms/ui-atoms";
import { useDialog } from "@/app/hooks/use-dialog";
import { ensureVaultFolder, normalizeFolderPath } from "@/app/hooks/file-system/unique-file";
import { NEW_BOARD_MARKDOWN } from "@/app/utils/board/board-format";

type CreateFile = (name: string, content?: string, dirOverride?: FileSystemDirectoryHandle) => Promise<unknown>;

// "Sprint plan", "Sprint plan.md" and "Sprint plan.board.md" all give
// "Sprint plan.board"; a blank name gives null.
export function boardBaseName(name: string): string | null {
  const stem = name.trim().replace(/\.md$/i, "").replace(/\.board$/i, "").trim();
  return stem ? `${stem}.board` : null;
}

// "New board": asks the name, then `<name>.board.md` in the New Notes folder
// (numbered `<name> (1).board.md` on a clash by createUniqueFile). Cancel or
// a blank name creates nothing. createFile opens it and shows its own
// success and error toasts.
export function useCreateBoard(createFile: CreateFile) {
  const store = useStore();
  const dialog = useDialog();
  return useCallback(async () => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return;
    const baseName = boardBaseName(String((await dialog.prompt("Board name:", "Untitled", "New board")) ?? ""));
    if (!baseName) return;
    try {
      const folder = await ensureVaultFolder(vaultHandle, normalizeFolderPath(store.get(atom_newNoteFolder)));
      await createFile(baseName, NEW_BOARD_MARKDOWN, folder);
    } catch (err) {
      console.error("Failed to create board:", err);
      toast.error("Couldn't create the board.");
    }
  }, [createFile, dialog, store]);
}
