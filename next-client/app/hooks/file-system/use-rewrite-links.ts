"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { createLinkResolver } from "@/app/utils/note-links/link-resolver";
import {
  findRewriteCandidates,
  mapMovedPath,
  rewriteLinksInText,
  type PathMove,
} from "@/app/utils/note-links/rewrite-links";
import { useNoteBuffer } from "./use-note-buffer";

export interface RewriteLinksResult {
  updated: number;
  failed: number;
}

// After notes or folders moved (paths already remapped in atom_fileMetadata):
// rewrites the [[wikilinks]] that would no longer resolve to the same note.
// `before` is the metadata snapshot from before the move. Notes are written
// through the tab buffer (disk wins, no prompt). One failed note never stops
// the rest.
export function useRewriteLinksAfterMove() {
  const store = useStore();
  const { writeThrough } = useNoteBuffer();

  return useCallback(
    async (before: Record<string, FileMetadata>, moves: PathMove[]): Promise<RewriteLinksResult> => {
      const vaultHandle = store.get(atom_vaultHandle);
      const after = store.get(atom_fileMetadata);
      const outcome: RewriteLinksResult = { updated: 0, failed: 0 };
      if (!vaultHandle || moves.length === 0) return outcome;

      const candidates = findRewriteCandidates(before, after, moves);
      if (candidates.length === 0) return outcome;
      const beforeResolver = createLinkResolver(before);
      const afterResolver = createLinkResolver(after);

      for (const oldPath of candidates) {
        const newPath = mapMovedPath(oldPath, moves);
        try {
          const handle = await resolveFileHandleAtPath(vaultHandle, newPath);
          const { result } = await writeThrough(newPath, handle, (text) =>
            rewriteLinksInText(text, {
              sourceOldPath: oldPath,
              sourceNewPath: newPath,
              before: beforeResolver,
              after: afterResolver,
              moves,
            }),
          );
          if (result === "written") outcome.updated++;
          else if (result === "failed") outcome.failed++;
        } catch (err) {
          console.warn("Couldn't update links in", newPath, err);
          outcome.failed++;
        }
      }
      return outcome;
    },
    [store, writeThrough],
  );
}
