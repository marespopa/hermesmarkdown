"use client";

import { useAtomValue } from "jotai";
import { useEffect } from "react";
import {
  atom_vaultHandle,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_content,
} from "@/app/atoms/atoms";
import { metadataWorker } from "./shared";

export function useIndexActiveFile() {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const content = useAtomValue(atom_content);

  // Debounced Active File Re-indexing
  useEffect(() => {
    if (!activeFileHandle || !metadataWorker || !vaultHandle || !activeFilePath) return;

    const timeoutId = setTimeout(async () => {
      try {
        metadataWorker?.postMessage({
          files: [{ handle: activeFileHandle, path: activeFilePath }],
        });
      } catch (err: any) {
        console.error("Failed to index active file:", err);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content, activeFileHandle, vaultHandle, activeFilePath]);
}
