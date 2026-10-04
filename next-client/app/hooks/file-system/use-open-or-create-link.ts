"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_activeFilePath } from "@/app/atoms/file-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { resolveFileMetaByName } from "./resolve-file-by-name";

interface UseOpenOrCreateLinkProps {
  openFile: (fileHandle: FileSystemFileHandle, providedPath?: string, force?: boolean) => Promise<void>;
  createNoteFromMissingLink: (link: string) => Promise<void>;
}

// Wikilink clicks: open the note the link resolves to (same rules as
// openFileByName), or start the create-from-template flow when it's missing.
export function useOpenOrCreateLink({ openFile, createNoteFromMissingLink }: UseOpenOrCreateLinkProps) {
  const store = useStore();

  const openOrCreateLink = useCallback(async (name: string) => {
    // The resolver strips `|alias` but not `#heading`; drop it so
    // [[note#Heading]] opens note.md instead of offering to create it.
    const target = name.split("|")[0].split("#")[0];
    const match = resolveFileMetaByName(target, store.get(atom_fileMetadata), store.get(atom_activeFilePath));
    if (match) {
      await openFile(match.handle, match.path);
      return;
    }
    await createNoteFromMissingLink(name);
  }, [store, openFile, createNoteFromMissingLink]);

  return { openOrCreateLink };
}
