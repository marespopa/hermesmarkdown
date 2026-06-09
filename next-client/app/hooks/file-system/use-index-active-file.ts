"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import {
  atom_vaultHandle,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_content,
  atom_indexerState,
  atom_fileLastModified,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { metadataWorker } from "./shared";

export function useIndexActiveFile() {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const content = useAtomValue(atom_content);
  const setIndexerState = useSetAtom(atom_indexerState);
  const setFileMetadata = useSetAtom(atom_fileMetadata);
  const fileLastModified = useAtomValue(atom_fileLastModified);

  // Debounced Active File Re-indexing
  useEffect(() => {
    if (!activeFileHandle || !metadataWorker || !vaultHandle || !activeFilePath) return;

    const timeoutId = setTimeout(async () => {
      try {
        // Optimization: Use the last known modification time or current time for in-memory indexing.
        // This avoids triggering a network request (client.getFile) on every change for Drive files.
        const modifiedAt = Date.now();
        
        setIndexerState("compiling");
        metadataWorker?.postMessage({
          files: [{ path: activeFilePath, name: activeFileHandle.name, content, modifiedAt }],
        });
      } catch (err: any) {
        console.error("Failed to index active file:", err);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content, activeFileHandle, vaultHandle, activeFilePath, setIndexerState]);

  // Handle worker response for the active file specifically
  useEffect(() => {
    if (!metadataWorker || !activeFilePath || !activeFileHandle) return;

    const handleMessage = (event: MessageEvent) => {
      const { results } = event.data;
      if (!results) return;

      const activeResult = results.find((r: any) => r.path === activeFilePath);
      if (activeResult) {
        setFileMetadata((prev) => {
          const existing = prev[activeFilePath];
          // Only update if the worker response is for our latest version or newer
          if (!existing || activeResult.modifiedAt >= (existing.modifiedAt || 0)) {
            return {
              ...prev,
              [activeFilePath]: {
                ...activeResult,
                // Ensure we keep the handle, preferring the active one
                handle: existing?.handle || activeFileHandle,
              },
            };
          }
          return prev;
        });
        setIndexerState("idle");
      }
    };

    metadataWorker.addEventListener("message", handleMessage);
    return () => metadataWorker?.removeEventListener("message", handleMessage);
  }, [activeFilePath, activeFileHandle, setFileMetadata, setIndexerState]);
}
