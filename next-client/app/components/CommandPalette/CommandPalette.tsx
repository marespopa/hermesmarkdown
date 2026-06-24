"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useCommandPalette, type Command } from "./CommandPaletteContext";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { HiOutlineSearch } from "react-icons/hi";

const ROW_HEIGHT = 36;
const MAX_VISIBLE_ROWS = 8;

function fuzzyMatch(query: string, target: string): { score: number; indices: number[] } | null {
  if (!query) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let score = 0;
  const indices: number[] = [];
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      score += 1;
      qi++;
    }
  }
  return qi === q.length ? { score, indices } : null;
}

function HighlightedText({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <>{text}</>;
  const set = new Set(indices);
  return (
    <>
      {text.split("").map((ch, i) => (
        <span key={i} className={set.has(i) ? "text-accent" : undefined}>
          {ch}
        </span>
      ))}
    </>
  );
}

type FileResult = { path: string; name: string; handle: any; tags: string[] };
type Row =
  | { kind: "command"; command: Command; indices: number[] }
  | { kind: "file"; file: FileResult; indices: number[]; matchedTag?: string };

// Matches a file by name, path, or any of its tags — typing "#tag" searches
// tags exclusively (mirrors the sidebar's `#tag` convention); a plain query
// checks name first (highlighted), then path, then tags (shown as the
// secondary line instead of the path when that's what matched).
function matchFile(query: string, file: FileResult): { score: number; indices: number[]; matchedTag?: string } | null {
  if (query.startsWith("#")) {
    const tagQuery = query.slice(1);
    if (!tagQuery) return file.tags.length > 0 ? { score: 0, indices: [] } : null;
    let best: { score: number; tag: string } | null = null;
    for (const tag of file.tags) {
      const m = fuzzyMatch(tagQuery, tag);
      if (m && (!best || m.score > best.score)) best = { score: m.score, tag };
    }
    return best ? { score: best.score, indices: [], matchedTag: best.tag } : null;
  }

  const nameMatch = fuzzyMatch(query, file.name);
  if (nameMatch) return nameMatch;

  const pathMatch = fuzzyMatch(query, file.path);
  if (pathMatch) return { score: pathMatch.score, indices: [] };

  for (const tag of file.tags) {
    const tagMatch = fuzzyMatch(query, tag);
    if (tagMatch) return { score: tagMatch.score, indices: [], matchedTag: tag };
  }
  return null;
}

export default function CommandPalette() {
  const { isOpen, close, commands, recentCommandIds, markUsed } = useCommandPalette();
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const { openFile } = useFileSystem();
  const isMobileChrome = useIsMobileChrome();
  const [mounted, setMounted] = useState(false);
  const [showBackdrop, setShowBackdrop] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setShowBackdrop(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      const t = setTimeout(() => setShowBackdrop(false), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const fileResults: FileResult[] = useMemo(
    () => Object.values(fileMetadata).map((m) => ({ path: m.path, name: m.name, handle: m.handle, tags: m.tags })),
    [fileMetadata],
  );

  // ">" explicitly switches to file search (mirrors the app's only mode
  // switch — VSCode-style — without a separate UI state); a query that
  // matches zero commands also falls through to file search automatically,
  // with no label change or layout shift.
  const isExplicitFileMode = query.startsWith(">");
  const fileQuery = isExplicitFileMode ? query.slice(1).trimStart() : query.trim();

  const commandRows: Row[] = useMemo(() => {
    if (isExplicitFileMode) return [];
    const trimmed = query.trim();
    if (!trimmed) {
      const byRecent = [...commands].sort((a, b) => {
        const ai = recentCommandIds.indexOf(a.id);
        const bi = recentCommandIds.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
      return byRecent.slice(0, MAX_VISIBLE_ROWS).map((command) => ({ kind: "command" as const, command, indices: [] }));
    }
    return commands
      .map((command) => {
        const labelMatch = fuzzyMatch(trimmed, command.label);
        const match = labelMatch ?? fuzzyMatch(trimmed, command.keywords || "");
        return match ? { command, score: match.score, indices: labelMatch ? match.indices : [] } : null;
      })
      .filter((r): r is { command: Command; score: number; indices: number[] } => r !== null)
      .sort((a, b) => b.score - a.score)
      .map((r) => ({ kind: "command" as const, command: r.command, indices: r.indices }));
  }, [commands, query, isExplicitFileMode, recentCommandIds]);

  const inFileFallback = !isExplicitFileMode && query.trim().length > 0 && commandRows.length === 0;

  const fileRows: Row[] = useMemo(() => {
    if (!isExplicitFileMode && !inFileFallback) return [];
    const q = fileQuery;
    if (!q) {
      return fileResults
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, MAX_VISIBLE_ROWS)
        .map((file) => ({ kind: "file" as const, file, indices: [] }));
    }
    return fileResults
      .map((file) => {
        const match = matchFile(q, file);
        return match ? { file, score: match.score, indices: match.indices, matchedTag: match.matchedTag } : null;
      })
      .filter((r): r is { file: FileResult; score: number; indices: number[]; matchedTag: string | undefined } => r !== null)
      .sort((a, b) => b.score - a.score)
      .map((r) => ({ kind: "file" as const, file: r.file, indices: r.indices, matchedTag: r.matchedTag }));
  }, [fileResults, fileQuery, isExplicitFileMode, inFileFallback]);

  const rows: Row[] = isExplicitFileMode || inFileFallback ? fileRows : commandRows;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const execute = (index: number) => {
    const row = rows[index];
    if (!row) return;
    if (row.kind === "file") {
      openFile(row.file.handle, row.file.path);
      close();
      return;
    }
    markUsed(row.command.id);
    row.command.action();
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (rows.length === 0 ? 0 : (i + 1) % rows.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (rows.length === 0 ? 0 : (i - 1 + rows.length) % rows.length));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      execute(selectedIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  if (!mounted || !showBackdrop) return null;

  const rowHeightClass = isMobileChrome ? "min-h-11" : "h-9";

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div
        className={`absolute inset-0 bg-fg/30 transition-opacity duration-100 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      {isOpen && (
        <div
          className={
            isMobileChrome
              ? "fixed inset-0 flex flex-col bg-chrome animate-in slide-in-from-bottom duration-200"
              : "fixed left-1/2 top-[35vh] -translate-x-1/2 w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-35vh-2rem)] flex flex-col bg-chrome border border-edge rounded-2xl overflow-hidden"
          }
        >
          <div className="p-2 border-b border-b-edge">
            <div className="flex items-center h-11 sm:h-9 px-3 gap-2 rounded-xl border border-edge bg-paper-light dark:bg-paper-dark focus-within:ring-2 focus-within:ring-sage/20 transition-all duration-150">
              <HiOutlineSearch size={15} className="shrink-0 text-fg-faint" />
              <input
                ref={inputRef}
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-w-0 bg-transparent text-fg text-[15px] outline-none focus-visible:outline-none caret-accent"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore
                data-bwignore="true"
                data-nordpass-ignore="true"
              />
            </div>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto"
            style={!isMobileChrome ? { maxHeight: ROW_HEIGHT * MAX_VISIBLE_ROWS } : undefined}
          >
            {rows.length === 0 && (
              <div className="flex items-center justify-center h-9 text-ui-footnote text-fg-muted">No results</div>
            )}
            {rows.map((row, index) => {
              const key = row.kind === "command" ? row.command.id : row.file.path;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => execute(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between gap-3 pl-10 pr-4 ${rowHeightClass} text-left text-[14px] cursor-pointer select-none ${
                    isSelected ? "border-l-2 border-accent bg-accent/10 text-fg" : "border-l-2 border-transparent text-fg"
                  }`}
                >
                  {row.kind === "command" ? (
                    <>
                      <span className="truncate">
                        <HighlightedText text={row.command.label} indices={row.indices} />
                      </span>
                      {row.command.shortcut && !isMobileChrome && (
                        <span className="shrink-0 font-mono text-ui-micro text-fg-muted">{row.command.shortcut}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="truncate">
                        <HighlightedText text={row.file.name} indices={row.indices} />
                      </span>
                      <span className="shrink-0 truncate text-ui-micro text-fg-muted">
                        {row.matchedTag ? `#${row.matchedTag}` : row.file.path}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
