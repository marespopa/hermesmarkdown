"use client";

import { useAtom } from "jotai";
import { useCallback } from "react";
import {
  atom_vaultHandle,
  atom_currentDirectoryHandle,
} from "@/app/atoms/atoms";
import { withPickerLock } from "./shared";

interface UseImportItemProps {
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

export function useImportItem({ openFile }: UseImportItemProps) {
  const [vaultHandle] = useAtom(atom_vaultHandle);
  const [currentDirectoryHandle] = useAtom(atom_currentDirectoryHandle);

  const importFile = useCallback(async () => {
    // 1. Try Desktop File System Access API
    if ("showOpenFilePicker" in window) {
      try {
        const handle = await withPickerLock(async () => {
          try {
            const [handle] = await (window as any).showOpenFilePicker({
              types: [
                {
                  description: "Markdown",
                  accept: { "text/markdown": [".md", ".txt", ".markdown"] },
                },
              ],
              startIn: currentDirectoryHandle || vaultHandle || undefined,
            });
            return handle;
          } catch (err: any) {
            if (err.name === "AbortError" || err.name === "NotAllowedError") return undefined;
            throw err;
          }
        });

        if (handle) {
          await openFile(handle);
          return true;
        }
        return false;
      } catch (err: any) {
        if (err.name === "AbortError") return false;
        console.error("Picker failed, trying fallback:", err);
        return null;
      }
    }
    return null; // Signals to use fallback input
  }, [currentDirectoryHandle, vaultHandle, openFile]);

  return { importFile };
}
