"use client";

import { useStore } from "jotai";
import { useEffect } from "react";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { removeNoteContent } from "@/app/services/content-search-client";

// Drops notes from the worker's note-text index when they leave the metadata
// index: deletes, files gone on the next vault pass, vault close and vault
// switch (both reset metadata to {}). Renames are remapped beforehand by
// atom_remapVaultPaths, so removing the old key afterwards is a no-op.
// Mount once (CommandPalette does), not in hooks that many components call.
export function useContentIndexSync() {
  const store = useStore();

  useEffect(() => {
    let previous = store.get(atom_fileMetadata);
    return store.sub(atom_fileMetadata, () => {
      const next = store.get(atom_fileMetadata);
      if (next === previous) return;
      const removed = Object.keys(previous).filter((path) => !Object.prototype.hasOwnProperty.call(next, path));
      previous = next;
      if (removed.length > 0) removeNoteContent(removed);
    });
  }, [store]);
}
