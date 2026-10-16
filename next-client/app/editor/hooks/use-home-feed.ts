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
import { atom_goHome, atom_homeFeedOpen } from "@/app/atoms/ui-atoms";
import { useCommandPalette, useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import { useHomeFeedUrlSync } from "./use-home-feed-url";

interface UseHomeFeedOptions {
  hasVault: boolean;
  openFile: (handle: FileSystemFileHandle, path?: string) => Promise<void>;
  newNote: () => Promise<void>;
  materializeDraft: (paneId?: string) => Promise<string | null>;
  /** Opens a file from the device into the draft (the no-vault feed's "Open File…"). */
  importFile: () => Promise<void>;
}

// Wires the home feed into the editor page: open/close state, row opening,
// the new-note button, the open tasks, the palette's "Create '…'" row and
// the "Home feed" command. Opening any file (openFile, from anywhere) closes
// the feed. The
// open state is mirrored in the URL as `?view=home` (useHomeFeedUrlSync).
// With no vault open the feed is still reachable; it offers the vault
// actions and ways to start writing instead of notes.
export function useHomeFeed({ hasVault, openFile, newNote, materializeDraft, importFile }: UseHomeFeedOptions) {
  const store = useStore();
  const [isOpen, setIsOpen] = useAtom(atom_homeFeedOpen);
  const goHome = useSetAtom(atom_goHome);
  const openDraft = useSetAtom(atom_openDraft);
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);
  const { open: openPalette, isOpen: isPaletteOpen, setCreateNote } = useCommandPalette();
  useHomeFeedUrlSync(isOpen, hasVault, setIsOpen);

  // A draft with text is saved first, so opening a note never asks to discard
  // it. The feed stays up until openFile has read the note and closes it, so
  // the slow read never flashes the empty pane (or the previous tab).
  const openNote = useCallback(async (path: string) => {
    await materializeDraft();
    const handle = store.get(atom_fileMetadata)[path]?.handle as FileSystemFileHandle | undefined;
    if (handle) await openFile(handle, path);
  }, [materializeDraft, openFile, setIsOpen, store]);

  // A task's note, with the caret on the task (`line` is 0-indexed).
  const openTask = useCallback(async (path: string, line: number) => {
    await openNote(path);
    setPendingScrollTarget({ path, line: line + 1 });
  }, [openNote, setPendingScrollTarget]);

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

  const openDeviceFile = useCallback(async () => {
    setIsOpen(false);
    await importFile();
  }, [importFile, setIsOpen]);

  // The editor's one Home command: the vault's home feed (outside the
  // editor, "Open HermesMarkdown Website" goes to the landing page).
  useRegisterCommand({
    id: "open-home-feed",
    label: "Open Home",
    category: "Navigation",
    keywords: "home feed recent notes start vault",
    action: () => goHome(),
  });

  return {
    isHomeFeedOpen: isOpen,
    feedProps: {
      onOpenNote: (path: string) => void openNote(path),
      onNewNote: () => void startNewNote(),
      onSearch: (initialQuery?: string) => openPalette(initialQuery),
      onClose: () => setIsOpen(false),
      isSearchOpen: isPaletteOpen,
      hasVault,
      onOpenFile: () => void openDeviceFile(),
      onOpenTask: (path: string, line: number) => void openTask(path, line),
    },
  };
}
