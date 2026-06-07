"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import {
  atom_vaultHandle,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_content,
  atom_indexerState,
} from "@/app/atoms/atoms";
import { metadataWorker } from "./shared";

export function useIndexActiveFile() {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const content = useAtomValue(atom_content);
  const setIndexerState = useSetAtom(atom_indexerState);

  // Debounced Active File Re-indexing
  useEffect(() => {
    if (!activeFileHandle || !metadataWorker || !vaultHandle || !activeFilePath) return;

    const timeoutId = setTimeout(async () => {
      try {
        const file = await activeFileHandle.getFile();
        const fileContent = await file.text();
        setIndexerState("compiling");
        metadataWorker?.postMessage({
          files: [{ path: activeFilePath, name: activeFileHandle.name, content: fileContent, modifiedAt: file.lastModified }],
        });
      } catch (err: any) {
        console.error("Failed to index active file:", err);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content, activeFileHandle, vaultHandle, activeFilePath, setIndexerState]);
}
