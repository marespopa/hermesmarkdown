"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_lastSavedContent,
  atom_fileConflict,
} from "@/app/atoms/atoms";
import { withPickerLock } from "./shared";

interface UseExportFileProps {
  saveFile: (content: string, handle?: FileSystemFileHandle) => Promise<boolean>;
}

export function useExportFile({ saveFile }: UseExportFileProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileConflict] = useAtom(atom_fileConflict);

  const exportFile = useCallback(
    async (content: string, fileName: string) => {
      if (!content.trim()) return false;

      const baseName =
        fileName.trim() ||
        content
          .split("\n")[0]
          .replace(/[^\w\s]/gi, "")
          .slice(0, 20)
          .trim() ||
        "untitled";

      const finalName = baseName.endsWith(".md") ? baseName : `${baseName}.md`;

      // 1. Try Desktop File System Access API
      if ("showSaveFilePicker" in window) {
        try {
          const handle = await withPickerLock(async () => {
            try {
              return await (window as any).showSaveFilePicker({
                suggestedName: finalName,
                types: [
                  { description: "Markdown", accept: { "text/markdown": [".md"] } },
                ],
                startIn: vaultHandle || undefined,
              });
            } catch (err: any) {
              if (err.name === "AbortError" || err.name === "NotAllowedError") return undefined;
              throw err;
            }
          });

          if (handle) {
            const success = await saveFile(content, handle);
            if (success) return true;
          } else if (handle === null) {
             return false;
          }
        } catch (err: any) {
          console.error("Picker failed, trying fallback:", err);
        }
      }

      // 2. Try Web Share API (Better for Android/iOS)
      if (navigator.share && (navigator as any).canShare) {
        const file = new File([content], finalName, { type: "text/markdown" });
        if ((navigator as any).canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: finalName,
            });
            setLastSavedContent(content);
            setFileConflict(null);
            toast.success("Shared successfully");
            return true;
          } catch (err: any) {
            if (err instanceof Error && err.name === "AbortError") return false;
            console.error("Share failed:", err);
          }
        }
      }

      // 3. Fallback: Blob Download
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setLastSavedContent(content);
      setFileConflict(null);
      toast.success("Download started");
      return true;
    },
    [vaultHandle, saveFile, setLastSavedContent, setFileConflict],
  );

  return { exportFile };
}
