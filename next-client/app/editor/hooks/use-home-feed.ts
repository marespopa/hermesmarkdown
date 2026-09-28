"use client";

import { useCallback, useEffect } from "react";
import { useAtom, useSetAtom, useStore } from "jotai";
import toast from "react-hot-toast";
import {
  atom_openDraft,
  atom_openFiles,
  atom_pendingScrollTarget,
  EMPTY_DRAFT,
} from "@/app/atoms/atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_homeFeedOpen } from "@/app/atoms/ui-atoms";
import { useCommandPalette, useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import type { MaterializeDraftOptions } from "./use-materialize-draft";

interface UseHomeFeedOptions {
  hasVault: boolean;
  openFile: (handle: FileSystemFileHandle, path?: string) => Promise<void>;
  newNote: () => Promise<void>;
  materializeDraft: (paneId?: string, options?: MaterializeDraftOptions) => Promise<string | null>;
}

// Wires the home feed into the editor page: open/close state, row opening,
// the new-note button, the palette's "Create '…'" row and the "Home feed"
// command. Opening any file (openFile, from anywhere) closes the feed.
export function useHomeFeed({ hasVault, openFile, newNote, materializeDraft }: UseHomeFeedOptions) {
  const store = useStore();
  const [isOpen, setIsOpen] = useAtom(atom_homeFeedOpen);
  const openDraft = useSetAtom(atom_openDraft);
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);
  const { open: openPalette, isOpen: isPaletteOpen, setCreateNote } = useCommandPalette();

  // A draft with text is saved first, so opening a note never asks to discard
  // it. A draft whose picker was dismissed stays in the draft slot unasked.
  const openNote = useCallback(async (path: string) => {
    setIsOpen(false);
    await materializeDraft(undefined, { background: true });
    const handle = store.get(atom_fileMetadata)[path]?.handle as FileSystemFileHandle | undefined;
    if (handle) await openFile(handle, path);
  }, [materializeDraft, openFile, setIsOpen, store]);

  const startNewNote = useCallback(async () => {
    setIsOpen(false);
    await newNote();
  }, [newNote, setIsOpen]);

  // A note titled with the palette query, saved right away, caret below
  // the heading. Draft text already in progress is saved as its own note
  // first; if that fails the draft stays put rather than being replaced.
  const createNote = useCallback(async (title: string) => {
    setIsOpen(false);
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
  }, [materializeDraft, openDraft, setIsOpen, setPendingScrollTarget, store]);

  useEffect(() => {
    setCreateNote(hasVault ? createNote : null);
    return () => setCreateNote(null);
  }, [createNote, hasVault, setCreateNote]);

  useRegisterCommand(hasVault ? {
    id: "open-home-feed",
    label: "Home feed",
    category: "Navigation",
    keywords: "recent notes feed start home",
    action: () => setIsOpen(true),
  } : null);

  return {
    isHomeFeedOpen: isOpen && hasVault,
    feedProps: {
      onOpenNote: (path: string) => void openNote(path),
      onNewNote: () => void startNewNote(),
      onSearch: (initialQuery?: string) => openPalette(initialQuery),
      onClose: () => setIsOpen(false),
      isSearchOpen: isPaletteOpen,
    },
  };
}
