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
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { metadataWorker } from "./shared";
import { markContentIndexed } from "@/app/services/content-search-client";

export function useIndexActiveFile() {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const content = useAtomValue(atom_content);
  const setIndexerState = useSetAtom(atom_indexerState);
  const setFileMetadata = useSetAtom(atom_fileMetadata);

  // Debounced Active File Re-indexing
  useEffect(() => {
    if (!activeFileHandle || !metadataWorker || !vaultHandle || !activeFilePath) return;

    const timeoutId = setTimeout(async () => {
      try {
        // Optimization: Use the last known modification time or current time for in-memory indexing.
        // This avoids triggering a network request (client.getFile) on every change for Drive files.
        const modifiedAt = Date.now();

        setIndexerState("compiling");
        // The worker also updates its note-text index from this (unsaved) text.
        markContentIndexed([{ path: activeFilePath, modifiedAt }]);
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
      const { results, requestId } = event.data;
      // Vault indexing runs (requestId set) merge their own results.
      if (!results || requestId !== undefined) return;

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
