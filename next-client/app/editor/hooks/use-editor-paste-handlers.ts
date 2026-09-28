import { useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useAtomValue } from "jotai";
import { atom_currentDirectoryHandle, atom_vaultHandle } from "@/app/atoms/atoms";
import { useDialog } from "@/app/hooks/use-dialog";
import { savePastedImage } from "@/app/utils/paste-image";

// Refs handed to the CodeMirror paste handling: a confirm for turning pasted
// CSV/TSV into a Markdown table, and an image saver that writes pasted or
// dropped images into the vault's assets/ folder. Refs keep the extension
// stable while the callbacks see current state.
export function useEditorPasteHandlers() {
  const dialog = useDialog();
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const currentDirectoryHandle = useAtomValue(atom_currentDirectoryHandle);

  const csvConfirmRef = useRef<((preview: string) => Promise<boolean>) | null>(null);
  csvConfirmRef.current = useCallback(
    (preview: string) =>
      dialog.confirm(
        `Pasted content looks like tabular data (${preview.split("\n").length} rows). Convert it into a Markdown table?`,
        "Convert to table?",
        "Convert to table",
        "Paste as text",
      ),
    [dialog],
  );

  const pasteImageRef = useRef<((file: File) => Promise<string | null>) | null>(null);
  pasteImageRef.current = useCallback(
    async (file: File) => {
      if (!vaultHandle) {
        toast.error("Open a vault folder before pasting images");
        return null;
      }
      try {
        return await savePastedImage(vaultHandle, currentDirectoryHandle, file);
      } catch (err: any) {
        console.warn("Failed to save pasted image:", err?.message || err);
        toast.error("Failed to save pasted image");
        return null;
      }
    },
    [vaultHandle, currentDirectoryHandle],
  );

  return { csvConfirmRef, pasteImageRef };
}
