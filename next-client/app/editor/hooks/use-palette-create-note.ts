"use client";

import { useCallback, useEffect } from "react";
import { useSetAtom, useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_openDraft, atom_openFiles, atom_pendingScrollTarget, EMPTY_DRAFT } from "@/app/atoms/atoms";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";

interface UsePaletteCreateNoteOptions {
  hasVault: boolean;
  materializeDraft: (paneId?: string) => Promise<string | null>;
}

// The palette's "Create '…'" row, with a vault open: a note titled with the
// query, saved right away, caret below the heading. Draft text already in
// progress is saved as its own note first; if that fails the draft stays put
// rather than being replaced.
export function usePaletteCreateNote({ hasVault, materializeDraft }: UsePaletteCreateNoteOptions) {
  const store = useStore();
  const openDraft = useSetAtom(atom_openDraft);
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);
  const { setCreateNote } = useCommandPalette();

  const createNote = useCallback(async (title: string) => {
    openDraft();
    await materializeDraft();
    if (store.get(atom_openFiles).draft?.content.trim()) {
      toast.error("Couldn't save the current draft, so it was left open.");
      return;
    }
    store.set(atom_openFiles, (prev) => ({
      ...prev,
      draft: { ...(prev.draft ?? EMPTY_DRAFT), content: `# ${title}\n\n` },
    }));
    const path = await materializeDraft();
    setPendingScrollTarget({ path: path ?? "draft", line: 3 });
  }, [materializeDraft, openDraft, setPendingScrollTarget, store]);

  useEffect(() => {
    setCreateNote(hasVault ? createNote : null);
    return () => setCreateNote(null);
  }, [createNote, hasVault, setCreateNote]);
}
