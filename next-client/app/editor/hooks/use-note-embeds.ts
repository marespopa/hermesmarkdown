"use client";

import { useEffect, useMemo, useState } from "react";
import { atom, useAtomValue } from "jotai";
import type { EditorView } from "@codemirror/view";
import type { FileMetadata } from "@/app/atoms/metadata";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_revealAllPrivate, atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { resolveFileMetaByName } from "@/app/hooks/file-system/resolve-file-by-name";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { noteEmbedsDataField, setNoteEmbeds, type EmbedContent, type NoteEmbedsData } from "../codemirror/note-embeds";
import { csvCandidatePaths, csvToMarkdownTable, embedKey, findEmbeds, type EmbedRef } from "../utils/note-embeds";

// Disk reads, by path + modified time, shared by every pane.
const diskCache = new Map<string, string>();
const MAX_CACHED = 50;
// A line starting with `![[` or `/`: the cheap check before the full scan.
const MAY_EMBED = /^[ \t]*(?:!\[\[|\/[^\s/])/m;
// Edits in an embedded note's tab reach the embed once typing pauses.
const SETTLE_MS = 200;

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

// CSV files aren't in the vault index, so they're looked up by path: next to
// the note first, then from the vault root.
async function readCsv(vault: FileSystemDirectoryHandle | null, ref: EmbedRef, fromPath: string | undefined) {
  if (!vault) return null;
  for (const path of csvCandidatePaths(ref.target, fromPath)) {
    try {
      const text = await (await (await resolveFileHandleAtPath(vault, path)).getFile()).text();
      return { path, text };
    } catch {
      // Not there; try the next place.
    }
  }
  return null;
}

// The notes and CSV files embedded in `value` (`![[Note]]`, `/Note.md`,
// `/data.csv` lines), pushed into `view` for its embed widgets
// (codemirror/note-embeds.ts). A note open in a tab shows its live text,
// unsaved edits included; any other note is read from disk and read again
// when the vault scan sees it change. A CSV is read again on each scan.
// Private notes stay veiled until they're revealed, like everywhere else.
export function useNoteEmbeds(
  view: EditorView | null,
  value: string,
  fileMetadata: Record<string, FileMetadata>,
  fromPath: string | undefined,
  open: (target: string) => void,
): NoteEmbedsData {
  const refsSignature = useMemo(
    () => (MAY_EMBED.test(value)
      ? [...new Set(findEmbeds(value).map(({ ref }) => JSON.stringify(ref)))].join("\n")
      : ""),
    [value],
  );
  const resolved = useMemo(() => {
    const refs: EmbedRef[] = refsSignature ? refsSignature.split("\n").map((ref) => JSON.parse(ref)) : [];
    return refs.map((ref) => ({ ref, meta: ref.kind === "note" ? resolveFileMetaByName(ref.target, fileMetadata, fromPath) : null }));
  }, [refsSignature, fileMetadata, fromPath]);

  // Only the open tabs' text for the embedded notes, so typing elsewhere
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
  const vault = useAtomValue(atom_vaultHandle);
  const revealAll = useAtomValue(atom_revealAllPrivate);
  const revealed = useAtomValue(atom_revealedPrivatePaths);

  const [contents, setContents] = useState<Map<string, EmbedContent>>(() => new Map());

  useEffect(() => {
    if (!resolved.length) {
      setContents((current) => (current.size ? new Map() : current));
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const next = new Map<string, EmbedContent>();
      for (const [i, { ref, meta }] of resolved.entries()) {
        const key = embedKey(ref);
        if (ref.kind === "csv") {
          const csv = await readCsv(vault, ref, fromPath);
          if (cancelled) return;
          next.set(key, csv ? { kind: "note", path: csv.path, markdown: csvToMarkdownTable(csv.text) } : { kind: "missing" });
        } else if (!meta) next.set(key, { kind: "missing" });
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
    }, SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resolved, openTexts, vault, fromPath, revealAll, revealed, fileMetadata]);

  const data = useMemo(() => ({ contents, open }), [contents, open]);
  useEffect(() => {
    if (view && view.state.field(noteEmbedsDataField, false) !== data) view.dispatch({ effects: setNoteEmbeds.of(data) });
  }, [view, data]);
  return data;
}
