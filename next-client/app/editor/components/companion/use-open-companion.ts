"use client";

import { useCallback } from "react";
import { useSetAtom, useStore } from "jotai";
import { atom_activeFilePath } from "@/app/atoms/atoms";
import { atom_openCompanion } from "@/app/atoms/companion-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";

// Opens the companion from an entry point with the note in front and its
// selection as context, read at the moment it opens. A private note is never
// attached: the companion opens with no context instead.
export function useOpenCompanion() {
  const store = useStore();
  const openCompanion = useSetAtom(atom_openCompanion);
  return useCallback((request: { prompt?: string; autoSend?: boolean } = {}) => {
    const path = store.get(atom_activeFilePath);
    const view = store.get(atom_activeEditorView);
    const isPrivate = !!path && (
      isPrivateFrontmatter(store.get(atom_fileMetadata)[path]?.frontmatter) ||
      (!!view && isPrivateContent(view.state.doc.toString()))
    );
    if (isPrivate) {
      openCompanion(request);
      return;
    }
    const range = view?.state.selection.main;
    openCompanion({ ...request, path, selection: view && range ? view.state.sliceDoc(range.from, range.to) : "" });
  }, [store, openCompanion]);
}
