import { useAtom, useAtomValue } from "jotai";
import { useCallback } from "react";
import { PanelLeaf } from "@/app/types/workspace";
import {
  atom_fileContent,
  atom_openFiles,
  atom_closeTab,
  atom_liveHandles,
  atom_autosaveMode,
  atom_vaultHandle,
  contentStore,
} from "@/app/atoms/atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useDialog } from "@/app/hooks/use-dialog";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import { TabContextMenuItem } from "../components/TabContextMenu";

// Shared between the desktop pane tab bar and the mobile control rail so
// Save/Copy/Close behavior stays a single source of truth even though the
// two surfaces render completely different UI around it.
export function usePaneFileActions(leaf: PanelLeaf | null) {
  const filePath = leaf?.activeFilePath || "draft";
  const [content] = useAtom(atom_fileContent(filePath));
  const [openFiles] = useAtom(atom_openFiles);
  const [, closeTab] = useAtom(atom_closeTab);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const liveHandle = useAtomValue(atom_liveHandles(filePath));
  const { saveFile, exportFile, createFile } = useFileSystem();
  const dialog = useDialog();

  const handleExport = useCallback(async () => {
    if (!content.trim()) return;
    const fileState = openFiles[filePath];
    const fileName = fileState?.fileName || "Untitled";
    if (liveHandle) {
      const success = await saveFile(content, liveHandle, 0, false, filePath);
      if (success) return;
    }
    await exportFile(content, fileName);
  }, [content, openFiles, filePath, liveHandle, saveFile, exportFile]);

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;

    // Save in place if we already have a live handle.
    if (liveHandle) {
      await saveFile(content, liveHandle, 0, false, filePath);
      return;
    }

    // Real file that lost its handle (e.g. after reload, before vault rebind).
    // Walk the vault to recover the handle before falling back to "save as".
    if (filePath !== "draft" && vaultHandle) {
      try {
        const parts = filePath.split("/");
        let current: FileSystemDirectoryHandle = vaultHandle;
        for (let i = 0; i < parts.length - 1; i++) {
          current = await current.getDirectoryHandle(parts[i]);
        }
        const recovered = await current.getFileHandle(parts[parts.length - 1]);
        await saveFile(content, recovered, 0, false, filePath);
        return;
      } catch {
        // Couldn't recover — fall through to the draft/save-as path below.
      }
    }

    // Draft saved to the vault for the first time → prompt for a name and create.
    if (vaultHandle) {
      const fileState = openFiles[filePath];
      const fileName = fileState?.fileName || "untitled";
      const name = await dialog.prompt("Enter file name:", fileName.replace(".md", ""), "Save to Vault");
      if (name) {
        await createFile(name, content);
      }
      return;
    }

    // No vault → download.
    await handleExport();
  }, [content, liveHandle, filePath, vaultHandle, saveFile, openFiles, dialog, createFile, handleExport]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      showCopyToast("Markdown copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      showErrorToast("Failed to copy markdown");
    }
  }, [content]);

  const closeTabWithAutosave = useCallback(async (path: string) => {
    if (!leaf) return;
    const autosaveMode = contentStore.get(atom_autosaveMode);
    if (autosaveMode !== "manual") {
      const fileState = contentStore.get(atom_openFiles)[path];
      const tabHandle = contentStore.get(atom_liveHandles(path));
      if (fileState && fileState.content !== fileState.lastSavedContent && tabHandle) {
        // Fire and forget so we don't block tab closing if the file system is locked (e.g. Google Drive 45s retries)
        void saveFile(fileState.content, tabHandle, 0, true, path);
      }
    }
    closeTab({ paneId: leaf.id, filePath: path });
  }, [closeTab, leaf, saveFile]);

  const buildTabMenuItems = useCallback((targetPath: string): TabContextMenuItem[] => {
    const others = (leaf?.openFilePaths || []).filter((p) => p !== targetPath);
    return [
      { label: "Close", onClick: () => { void closeTabWithAutosave(targetPath); } },
      { label: "Close Others", disabled: others.length === 0, onClick: () => { for (const p of others) void closeTabWithAutosave(p); } },
      { label: "Close All", onClick: () => { for (const p of [...(leaf?.openFilePaths || [])]) void closeTabWithAutosave(p); } },
    ];
  }, [leaf, closeTabWithAutosave]);

  return { filePath, content, handleSave, handleExport, handleCopy, closeTabWithAutosave, buildTabMenuItems };
}
