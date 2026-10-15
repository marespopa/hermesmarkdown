"use client";

import { useEffect, useMemo, useState } from "react";
import { atom, useAtomValue } from "jotai";
import type { EditorView } from "@codemirror/view";
import type { FileMetadata } from "@/app/atoms/metadata";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_revealAllPrivate, atom_revealedPrivatePaths } from "@/app/atoms/privacy-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { resolveFileMetaByName } from "@/app/hooks/file-system/resolve-file-by-name";
import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { noteEmbedsDataField, setNoteEmbeds, type EmbedContent, type NoteEmbedsData } from "../codemirror/note-embeds";
import { csvToMarkdownTable, embedKey, findEmbeds, type EmbedRef } from "../utils/note-embeds";
import { clipCode, imageUrlFor, locateVaultFile, readLocatedText, readNoteFile } from "../utils/embed-files";

// A line starting with `![[` or `/`: the cheap check before the full scan.
const MAY_EMBED = /^[ \t]*(?:!\[\[|\/[^\s/])/m;
// Edits in an embedded note's tab reach the embed once typing pauses.
const SETTLE_MS = 200;

// Counts the times the window comes back into view, so embeds re-check their
// files then: a CSV edited in a spreadsheet app shows its new rows as soon as
// you switch back.
function useWindowReturns(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const bump = () => {
      if (document.visibilityState === "visible") setCount((n) => n + 1);
    };
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", bump);
    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", bump);
    };
  }, []);
  return count;
}

// The files embedded in `value` (`![[Note]]`, `/Note.md`, `/data.csv`,
// `/chart.png`, `/auth.ts` lines), pushed into `view` for its embed widgets
// (codemirror/note-embeds.ts). A note open in a tab shows its live text,
// unsaved edits included; everything else is read from disk, checked again
// on each vault scan and whenever the window comes back, and re-read only
// when its modified time changed. Private notes stay veiled until they're
// revealed, like everywhere else.
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
  const windowReturns = useWindowReturns();

  const [contents, setContents] = useState<Map<string, EmbedContent>>(() => new Map());

  useEffect(() => {
    if (!resolved.length) {
      setContents((current) => (current.size ? new Map() : current));
      return;
    }
    let cancelled = false;
    const load = async ({ ref, meta }: (typeof resolved)[number], openText: string | undefined): Promise<EmbedContent> => {
      if (ref.kind !== "note") {
        const located = await locateVaultFile(vault, ref, fromPath);
        if (!located) return { kind: "missing" };
        if (ref.kind === "image") return { kind: "image", path: located.path, url: imageUrlFor(located) };
        const text = await readLocatedText(located);
        if (ref.kind === "code") return { kind: "code", path: located.path, ...clipCode(text) };
        return { kind: "note", path: located.path, markdown: csvToMarkdownTable(text) };
      }
      if (!meta) return { kind: "missing" };
      if (meta.path === fromPath) return { kind: "self" };
      const markdown = openText ?? (await readNoteFile(meta));
      if (markdown === null) return { kind: "missing" };
      const veiled = (isPrivateFrontmatter(meta.frontmatter) || isPrivateContent(markdown))
        && !revealAll && !revealed.has(meta.path);
      return veiled ? { kind: "private" } : { kind: "note", path: meta.path, markdown };
    };
    const timer = setTimeout(async () => {
      const next = new Map<string, EmbedContent>();
      for (const [i, entry] of resolved.entries()) {
        let content: EmbedContent;
        try {
          content = await load(entry, openTexts[i]);
        } catch {
          content = { kind: "missing" };
        }
        if (cancelled) return;
        next.set(embedKey(entry.ref), content);
      }
      if (!cancelled) setContents(next);
    }, SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resolved, openTexts, vault, fromPath, revealAll, revealed, fileMetadata, windowReturns]);

  const data = useMemo(() => ({ contents, open }), [contents, open]);
  useEffect(() => {
    if (view && view.state.field(noteEmbedsDataField, false) !== data) view.dispatch({ effects: setNoteEmbeds.of(data) });
  }, [view, data]);
  return data;
}
