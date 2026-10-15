"use client";

import { useEffect, useMemo, useState } from "react";
import { atom, useAtomValue } from "jotai";
import type { FileMetadata } from "@/app/atoms/metadata";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_revealAllPrivate, atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import { resolveFileMetaByName } from "@/app/hooks/file-system/resolve-file-by-name";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import type { EmbedContent, NoteEmbedsData } from "../codemirror/note-embeds";
import { embedKey, findEmbeds, type EmbedRef } from "../utils/note-embeds";

// Disk reads, by path + modified time, shared by every pane.
const diskCache = new Map<string, string>();
const MAX_CACHED = 50;

async function readNote(meta: FileMetadata): Promise<string | null> {
  const key = `${meta.path}\u0000${meta.modifiedAt}`;
  const cached = diskCache.get(key);
  if (cached !== undefined) return cached;
  try {
    const text: string = await (await meta.handle.getFile()).text();
    if (diskCache.size >= MAX_CACHED) diskCache.delete(diskCache.keys().next().value!);
    diskCache.set(key, text);
    return text;
  } catch {
    return null;
  }
}

// The notes embedded in `value` with `![[Note]]` lines, for the editor's
// embed widgets (codemirror/note-embeds.ts). A note open in a tab shows its
// live text, unsaved edits included; any other note is read from disk and
// read again when the vault scan sees it change. Private notes stay veiled
// until they're revealed, like everywhere else.
export function useNoteEmbeds(
  value: string,
  fileMetadata: Record<string, FileMetadata>,
  fromPath: string | undefined,
  open: (target: string) => void,
): NoteEmbedsData {
  const refsSignature = useMemo(
    () => (value.includes("![[") ? [...new Set(findEmbeds(value).map(({ ref }) => JSON.stringify(ref)))].join("\n") : ""),
    [value],
  );
  const resolved = useMemo(() => {
    const refs: EmbedRef[] = refsSignature ? refsSignature.split("\n").map((ref) => JSON.parse(ref)) : [];
    return refs.map((ref) => ({ ref, meta: resolveFileMetaByName(ref.target, fileMetadata, fromPath) }));
  }, [refsSignature, fileMetadata, fromPath]);

  // Only the open tabs' text for the embedded paths, so typing elsewhere
  // doesn't re-render this editor.
  const pathsSignature = resolved.map(({ meta }) => meta?.path ?? "").join("\n");
  const openTextsAtom = useMemo(() => {
    const paths = pathsSignature.split("\n");
    let last: (string | undefined)[] = [];
    return atom((get) => {
      const files = get(atom_openFiles);
      const next = paths.map((path) => (path ? files[path]?.content : undefined));
      if (next.length !== last.length || next.some((text, i) => text !== last[i])) last = next;
      return last;
    });
  }, [pathsSignature]);
  const openTexts = useAtomValue(openTextsAtom);
  const revealAll = useAtomValue(atom_revealAllPrivate);
  const revealed = useAtomValue(atom_revealedPrivatePaths);

  const [contents, setContents] = useState<Map<string, EmbedContent>>(() => new Map());

  useEffect(() => {
    if (!resolved.length) {
      setContents((current) => (current.size ? new Map() : current));
      return;
    }
    let cancelled = false;
    (async () => {
      const next = new Map<string, EmbedContent>();
      for (const [i, { ref, meta }] of resolved.entries()) {
        const key = embedKey(ref);
        if (!meta) next.set(key, { kind: "missing" });
        else if (meta.path === fromPath) next.set(key, { kind: "self" });
        else {
          const markdown = openTexts[i] ?? (await readNote(meta));
          if (cancelled) return;
          const veiled = (isPrivateFrontmatter(meta.frontmatter) || (markdown !== null && isPrivateContent(markdown)))
            && !revealAll && !revealed.has(meta.path);
          next.set(key, markdown === null ? { kind: "missing" } : veiled ? { kind: "private" } : { kind: "note", path: meta.path, markdown });
        }
      }
      if (!cancelled) setContents(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [resolved, openTexts, fromPath, revealAll, revealed]);

  return useMemo(() => ({ contents, open }), [contents, open]);
}
