import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useDialog } from "@/app/hooks/use-dialog";
import { useAskSaveFolder } from "@/app/hooks/file-system/use-ask-save-folder";
import { ensureVaultFolder } from "@/app/hooks/file-system/unique-file";
import { NEW_BOARD_MARKDOWN } from "@/app/utils/board/board-format";

type CreateFile = (name: string, content?: string, dirOverride?: FileSystemDirectoryHandle) => Promise<unknown>;

// "Sprint plan", "Sprint plan.md" and "Sprint plan.board.md" all give
// "Sprint plan.board"; a blank name gives null.
export function boardBaseName(name: string): string | null {
  const stem = name.trim().replace(/\.md$/i, "").replace(/\.board$/i, "").trim();
  return stem ? `${stem}.board` : null;
}

// "New board": asks the name, then the folder, and creates `<name>.board.md`
// there (numbered `<name> (1).board.md` on a clash by createUniqueFile).
// Cancelling either question, or a blank name, creates nothing. createFile opens it and shows its own
// success and error toasts.
export function useCreateBoard(createFile: CreateFile) {
  const store = useStore();
  const dialog = useDialog();
  const askSaveFolder = useAskSaveFolder();
  return useCallback(async () => {
    const vaultHandle = store.get(atom_vaultHandle);
    if (!vaultHandle) return;
    const baseName = boardBaseName(String((await dialog.prompt("Board name:", "Untitled", "New board")) ?? ""));
    if (!baseName) return;
    const folderPath = await askSaveFolder(`Save "${baseName}.md"`);
    if (folderPath === null) return;
    try {
      const folder = await ensureVaultFolder(vaultHandle, folderPath);
      await createFile(baseName, NEW_BOARD_MARKDOWN, folder);
    } catch (err) {
      console.error("Failed to create board:", err);
      toast.error("Couldn't create the board.");
    }
  }, [askSaveFolder, createFile, dialog, store]);
}
