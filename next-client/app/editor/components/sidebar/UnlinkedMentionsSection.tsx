"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_noteDisplayItems } from "@/app/atoms/privacy-atoms";
import { atom_pendingScrollTarget } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { findNoteMentions, isContentSearchAvailable, type ContentSearchResult } from "@/app/services/content-search-client";
import SidebarSection from "./SidebarSection";
import { sidebarItemClass } from "./sidebar-classes";

const ROW_TEXT = "px-2 h-7 flex items-center text-ui-footnote text-fg-faint";
const DEBOUNCE_MS = 600;
const MAX_MENTIONS = 50;
const MIN_PHRASE_CHARS = 2;

type OnOpen = (handle: FileSystemFileHandle, path: string) => Promise<void>;

// The phrases a plain-text mention would use: the file's base name, and its
// frontmatter title when that differs.
function phrasesFor(name: string | undefined, title: unknown): string[] {
  const base = (name ?? "").replace(/\.md$/i, "").trim();
  const fm = typeof title === "string" ? title.trim() : "";
  const list = [base];
  if (fm && fm.toLowerCase() !== base.toLowerCase()) list.push(fm);
  return list.filter((phrase) => phrase.length >= MIN_PHRASE_CHARS);
}

function MentionList({ path, onOpen }: { path: string; onOpen: OnOpen }) {
  const metadata = useAtomValue(atom_fileMetadata);
  const display = useAtomValue(atom_noteDisplayItems);
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);
  const [result, setResult] = useState<ContentSearchResult | null>(null);
  const available = isContentSearchAvailable();

  const meta = metadata[path];
  const phrases = useMemo(() => phrasesFor(meta?.name, meta?.frontmatter?.title), [meta?.name, meta?.frontmatter?.title]);
  const phrasesKey = phrases.join("\n");

  useEffect(() => {
    setResult(null);
  }, [path, phrasesKey]);

  useEffect(() => {
    if (!available || phrases.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const paths = [...display.keys()].filter((candidate) => candidate !== path);
      void findNoteMentions(phrases, paths, MAX_MENTIONS).then((next) => {
        if (!cancelled && next) setResult(next);
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // phrasesKey stands in for phrases; metadata/display changes re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, path, phrasesKey, metadata, display]);

  if (!available) return <p className={ROW_TEXT}>Search isn&apos;t available in this browser</p>;
  if (phrases.length === 0) return <p className={ROW_TEXT}>Title too short to search</p>;
  if (!result) return null;

  const open = async (hit: ContentSearchResult["hits"][number]) => {
    const target = metadata[hit.path];
    if (!target) return;
    await onOpen(target.handle, hit.path);
    setPendingScrollTarget({ path: hit.path, line: hit.line, column: hit.column });
  };

  return (
    <>
      {result.hits.length === 0 && <p className={ROW_TEXT}>No unlinked mentions</p>}
      {result.hits.map((hit) => (
        <Button
          key={`${hit.path}:${hit.line}`}
          variant="unstyled"
          title={hit.path}
          onClick={() => void open(hit)}
          className={`${sidebarItemClass(false)} w-full h-auto py-1 flex-col items-start gap-0`}
        >
          <span className="w-full truncate">{display.get(hit.path)?.title ?? hit.name}</span>
          <span className="w-full truncate text-ui-caption text-fg-muted">{hit.snippet}</span>
        </Button>
      ))}
      {result.pending > 0 && <p className={ROW_TEXT}>Some notes are still being indexed</p>}
    </>
  );
}

// Notes that name the note in front as plain text without linking it.
// Collapsed by default; the search only runs while it is open (a collapsed
// section doesn't mount its children).
export default function UnlinkedMentionsSection({ path, onOpen }: { path: string; onOpen: OnOpen }) {
  return (
    <SidebarSection title="Unlinked mentions" defaultCollapsed>
      <MentionList path={path} onOpen={onOpen} />
    </SidebarSection>
  );
}
