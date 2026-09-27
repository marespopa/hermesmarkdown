import { useEffect } from "react";
import type React from "react";
import { useSetAtom } from "jotai";
import { atom_indexerState } from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { metadataWorker } from "./shared";

// Merges the metadata worker's parsed results into atom_fileMetadata,
// re-attaching each file's handle (handles can't cross into the worker, so
// the indexer keeps them in `pendingHandlesRef` while the worker runs).
export function useMetadataWorkerResults(pendingHandlesRef: React.RefObject<Map<string, FileSystemFileHandle>>) {
  const setFileMetadata = useSetAtom(atom_fileMetadata);
  const setIndexerState = useSetAtom(atom_indexerState);

  useEffect(() => {
    if (!metadataWorker) return;

    const handleMessage = (event: MessageEvent) => {
      const { results } = event.data;
      if (!results) return;
      if (pendingHandlesRef.current.size === 0) return;

      setFileMetadata((prev) => {
        const next = { ...prev };
        results.forEach((res: any) => {
          const handle = pendingHandlesRef.current.get(res.path);
          if (handle) next[res.path] = { ...res, handle };
        });
        return next;
      });
      setIndexerState("idle");
    };

    metadataWorker.addEventListener("message", handleMessage);
    return () => metadataWorker?.removeEventListener("message", handleMessage);
  }, [pendingHandlesRef, setFileMetadata, setIndexerState]);
}
