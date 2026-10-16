"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_revealAllPrivate, atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { resolveFileMetaByName } from "@/app/hooks/file-system/resolve-file-by-name";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { expandEmbeds, type ReadEmbed } from "../utils/note-embeds";
import { locateVaultFile, readLocatedText, readNoteFile } from "../utils/embed-files";

// The reader behind Export as PDF and Export as Compiled Markdown: a note is
// found like its wikilink (relative to the note embedding it) and read from
// its open tab, unsaved edits included, or from disk; other files are found
// next to that note or from the vault root. Veiled private notes and
// unreadable files give null, so their lines stay as written.
export function useEmbedReader(): ReadEmbed {
  const store = useStore();
  return useCallback<ReadEmbed>(async (ref, fromPath) => {
    if (ref.kind !== "note") {
      const located = await locateVaultFile(store.get(atom_vaultHandle), ref, fromPath);
      if (!located) return null;
      return { path: located.path, text: ref.kind === "image" ? "" : await readLocatedText(located) };
    }
    const meta = resolveFileMetaByName(ref.target, store.get(atom_fileMetadata), fromPath);
    if (!meta) return null;
    const text = store.get(atom_openFiles)[meta.path]?.content ?? (await readNoteFile(meta));
    if (text === null) return null;
    const veiled = (isPrivateContent(text) || isPrivateFrontmatter(meta.frontmatter))
      && !store.get(atom_revealAllPrivate) && !store.get(atom_revealedPrivatePaths).has(meta.path);
    return veiled ? null : { path: meta.path, text };
  }, [store]);
}

// `markdown` (the note at `notePath`) with every embed filled in, nested
// embeds included (utils/note-embeds.ts, expandEmbeds).
export function useCompileEmbeds(): (markdown: string, notePath: string) => Promise<string> {
  const read = useEmbedReader();
  return useCallback((markdown, notePath) => expandEmbeds(markdown, notePath, read), [read]);
}
