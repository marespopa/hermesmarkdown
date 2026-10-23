"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_activeFilePath } from "@/app/atoms/file-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { resolveFileLink } from "@/app/utils/note-links/file-link";

interface UseOpenFileLinkProps {
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
}

// Markdown file link clicks (`[Editor](./app/editor/README.md)`): open the
// vault file the path points at, read from the linking note's folder. A path
// that isn't in the vault says so; it never creates a note.
export function useOpenFileLink({ openFile }: UseOpenFileLinkProps) {
  const store = useStore();

  const openFileLink = useCallback(async (href: string, fromPath?: string | null) => {
    const match = resolveFileLink(href, store.get(atom_fileMetadata), fromPath ?? store.get(atom_activeFilePath));
    if (!match) {
      toast.error(`${href} isn't in the vault.`);
      return;
    }
    await openFile(match.handle, match.path);
  }, [store, openFile]);

  return { openFileLink };
}
