"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { EditorView } from "@codemirror/view";
import { HiOutlineSearch, HiOutlineX } from "react-icons/hi";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_allTasks } from "@/app/atoms/task-atoms";
import {
  atom_activeEditorView,
  atom_commandUseCounts,
  atom_editorFontFamily,
  atom_palettePinnedItems,
  atom_railPanel,
  atom_recentFilePaths,
  atom_showHiddenFiles,
  type PalettePinnedItem,
} from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import { showErrorToast } from "@/app/components/Toastr";
import { useFileSystem } from "@/app/hooks/use-file-system";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { matchCommand, matchFile, fuzzyMatch } from "./command-search";
import { useCommandPalette, type Command } from "./CommandPaletteContext";

const MAX_VISIBLE_ROWS = 12;
const MAX_PINS = 5;

const scopes = [
  { id: "tag", prefix: "#", label: "Tags" },
  { id: "command", prefix: ">", label: "Commands" },
  { id: "task", prefix: "!", label: "Tasks" },
  { id: "heading", prefix: "@", label: "Headings" },
] as const;

type Scope = (typeof scopes)[number]["id"];
type FileResult = { path: string; name: string; handle: FileSystemFileHandle; tags: string[] };
type TagMatch = { tag: string; score: number; indices: number[] };
type TaggedFileMatch = { file: FileResult; matches: TagMatch[]; score: number };
type Row =
  | { kind: "command"; id: string; label: string; detail: string; command: Command; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "file"; id: string; label: string; detail: string; file: FileResult; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "task"; id: string; label: string; detail: string; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "heading"; id: string; label: string; detail: string; from: number; titleIndices: number[]; detailIndices: number[]; score: number };

function HighlightedText({ text, indices }: { text: string; indices: number[] }) {
  const matches = new Set(indices);
  return <>{text.split("").map((character, index) => (
    <strong key={`${character}-${index}`} className={matches.has(index) ? "font-bold text-accent" : "font-normal"}>
      {character}
    </strong>
  ))}</>;
}

function scopeFromPrefix(value: string) {
  const scope = scopes.find((candidate) => "prefix" in candidate && candidate.prefix === value[0]);
  return scope ? { scope: scope.id, query: value.slice(1).trimStart() } : null;
}

function scopePrefix(scope: Scope) {
  return scopes.find((candidate) => candidate.id === scope)?.prefix ?? "";
}

function pinnedKey(item: PalettePinnedItem) {
  return `${item.kind}:${item.id}`;
}

export default function CommandPalette() {
  const { isOpen, initialQuery, close, commands, markUsed } = useCommandPalette();
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const tasks = useAtomValue(atom_allTasks);
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const fontFamily = useAtomValue(atom_editorFontFamily);
  const commandUseCounts = useAtomValue(atom_commandUseCounts);
  const [recentFilePaths, setRecentFilePaths] = useAtom(atom_recentFilePaths);
  const [pinnedItems, setPinnedItems] = useAtom(atom_palettePinnedItems);
  const [, setRailPanel] = useAtom(atom_railPanel);
  const { openFile } = useFileSystem();
  const router = useRouter();
  const pathname = usePathname();
  const isMobileChrome = useIsMobileChrome();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [contextRow, setContextRow] = useState<Row | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const explorerCommand = useMemo<Command>(() => ({
    id: "open-explorer",
    label: "Open Explorer",
    category: "Navigation",
    keywords: "files navigator sidebar browse",
    action: () => {
      setRailPanel("files");
      router.push("/editor/files");
    },
  }), [router, setRailPanel]);
  const paletteCommands = useMemo(
    () => [explorerCommand, ...commands.filter((command) => command.id !== explorerCommand.id)],
    [commands, explorerCommand],
  );

  useEffect(() => {
    if (!isOpen) return;
    const initialScope = scopeFromPrefix(initialQuery);
    setScope(initialScope?.scope ?? null);
    setQuery(initialScope?.query ?? initialQuery);
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [initialQuery, isOpen]);

  const files = useMemo<FileResult[]>(
    () => Object.values(fileMetadata)
      .filter((metadata) => showHiddenFiles || !metadata.path.split("/").some((segment) => segment.startsWith("_")))
      .map((metadata) => ({ path: metadata.path, name: metadata.name, handle: metadata.handle as FileSystemFileHandle, tags: metadata.tags })),
    [fileMetadata, showHiddenFiles],
  );
  const filesByTag = useMemo(() => {
    const indexedFiles = new Map<string, FileResult[]>();
    files.forEach((file) => file.tags.forEach((rawTag) => {
      const tag = rawTag.replace(/^#/, "").trim().toLowerCase();
      if (!tag) return;
      const taggedFiles = indexedFiles.get(tag);
      if (taggedFiles) taggedFiles.push(file);
      else indexedFiles.set(tag, [file]);
    }));
    return indexedFiles;
  }, [files]);

  const scopedRows = useMemo<Row[]>(() => {
    if (!scope) return [];
    if (scope === "command") {
      return paletteCommands.map((command) => {
        const match = matchCommand(query, command);
        return match ? {
          kind: "command" as const, id: command.id, label: command.label,
          detail: command.disabledReason ?? command.category ?? "Command", command,
          titleIndices: match.indices, detailIndices: [] as number[], score: match.score,
        } : null;
      }).filter((row): row is Extract<Row, { kind: "command" }> => row !== null)
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    }
    if (scope === "tag") {
      const tagQueries = query.split(/[\s,]+/).map((term) => term.replace(/^#/, "")).filter(Boolean);
      let matchedFiles: Map<string, TaggedFileMatch> | null = null;
      for (const tagQuery of tagQueries.length ? tagQueries : [""]) {
        const queryMatches = new Map<string, TaggedFileMatch>();
        filesByTag.forEach((taggedFiles, tag) => {
          const match = fuzzyMatch(tagQuery, tag);
          if (!match) return;
          taggedFiles.forEach((file) => {
            const previous = queryMatches.get(file.path);
            if (!previous || match.score > previous.score) {
              queryMatches.set(file.path, { file, matches: [{ tag, score: match.score, indices: match.indices }], score: match.score });
            }
          });
        });
        if (!matchedFiles) {
          matchedFiles = queryMatches;
          continue;
        }
        matchedFiles.forEach((previous, path) => {
          const next = queryMatches.get(path);
          if (!next) matchedFiles!.delete(path);
          else matchedFiles!.set(path, { file: previous.file, matches: [...previous.matches, ...next.matches], score: previous.score + next.score });
        });
      }
      return Array.from(matchedFiles?.values() ?? [])
        .map(({ file, matches, score }) => {
          let offset = 0;
          const detailIndices = matches.flatMap(({ tag, indices }) => {
            const shiftedIndices = indices.map((index) => offset + index + 1);
            offset += tag.length + 2;
            return shiftedIndices;
          });
          return {
            kind: "file" as const, id: file.path, label: file.name, detail: matches.map(({ tag }) => `#${tag}`).join(" "), file,
            titleIndices: [] as number[], detailIndices, score,
          };
        })
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    }
    if (scope === "task") {
      return tasks.map((task) => {
        const match = fuzzyMatch(query, task.text);
        return match ? { kind: "task" as const, id: task.id, label: task.text || "(empty task)", detail: `${task.path}:${task.line + 1}`, titleIndices: match.indices, detailIndices: [] as number[], score: match.score } : null;
      }).filter((row): row is Extract<Row, { kind: "task" }> => row !== null)
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    }
    if (!activeEditorView) return [];
    const headings: Extract<Row, { kind: "heading" }>[] = [];
    for (let number = 1; number <= activeEditorView.state.doc.lines; number++) {
      const line = activeEditorView.state.doc.line(number);
      const heading = /^(#{1,6})\s+(.+)$/.exec(line.text);
      if (!heading) continue;
      const match = fuzzyMatch(query, heading[2]);
      if (match) headings.push({ kind: "heading", id: `${line.from}`, label: heading[2], detail: `H${heading[1].length}`, from: line.from, titleIndices: match.indices, detailIndices: [], score: match.score });
    }
    return headings.sort((a, b) => b.score - a.score || a.from - b.from);
  }, [activeEditorView, filesByTag, paletteCommands, query, scope, tasks]);

  const fileRows = useMemo<Row[]>(() => {
    if (scope || !query) return [];
    return files.map((file) => {
      const match = matchFile(query, file);
      return match ? { kind: "file" as const, id: file.path, label: file.name, detail: file.path, file, titleIndices: match.titleIndices, detailIndices: match.pathIndices, score: match.score } : null;
    }).filter((row): row is Extract<Row, { kind: "file" }> => row !== null)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, MAX_VISIBLE_ROWS);
  }, [files, query, scope]);

  const resolvePinned = useCallback((item: PalettePinnedItem): Row | null => {
    if (item.kind === "file") {
      const file = files.find((candidate) => candidate.path === item.id);
      return file ? { kind: "file", id: file.path, label: file.name, detail: file.path, file, titleIndices: [], detailIndices: [], score: 0 } : null;
    }
    const command = paletteCommands.find((candidate) => candidate.id === item.id);
    return command ? { kind: "command", id: command.id, label: command.label, detail: command.category ?? "Command", command, titleIndices: [], detailIndices: [], score: 0 } : null;
  }, [files, paletteCommands]);

  const rows = useMemo(() => {
    if (scope) return scopedRows.slice(0, MAX_VISIBLE_ROWS);
    if (query) return fileRows;
    const pinned = pinnedItems.map(resolvePinned).filter((row): row is Row => row !== null);
    const pinnedKeys = new Set(pinnedItems.map(pinnedKey));
    const recent = recentFilePaths.slice(0, 5).filter((path) => !pinnedKeys.has(`file:${path}`))
      .map((path) => resolvePinned({ kind: "file", id: path })).filter((row): row is Row => row !== null);
    const frequent = paletteCommands.slice().sort((a, b) => (commandUseCounts[b.id] ?? 0) - (commandUseCounts[a.id] ?? 0) || a.label.localeCompare(b.label))
      .filter((command) => command.id !== explorerCommand.id && (commandUseCounts[command.id] ?? 0) > 0 && !pinnedKeys.has(`command:${command.id}`)).slice(0, 3)
      .map((command) => resolvePinned({ kind: "command", id: command.id })).filter((row): row is Row => row !== null);
    const explorer = resolvePinned({ kind: "command", id: explorerCommand.id });
    const topActions = [explorer, ...frequent].filter((row): row is Row => row !== null && !pinnedKeys.has(pinnedKey({ kind: "command", id: row.id })));
    return [...pinned, ...recent, ...topActions].slice(0, MAX_VISIBLE_ROWS);
  }, [commandUseCounts, explorerCommand.id, fileRows, paletteCommands, pinnedItems, query, recentFilePaths, resolvePinned, scope, scopedRows]);

  useEffect(() => setSelectedIndex(0), [query, scope]);
  useEffect(() => setSelectedIndex((index) => Math.min(index, Math.max(0, rows.length - 1))), [rows.length]);

  const execute = async (row: Row | undefined) => {
    if (!row || runningId) return;
    if (row.kind === "file") {
      setRunningId(`file:${row.id}`);
      try {
        await openFile(row.file.handle, row.file.path);
        setRecentFilePaths((previous) => [row.file.path, ...previous.filter((path) => path !== row.file.path)].slice(0, 5));
        if (!pathname.startsWith("/editor")) router.push("/editor");
        close();
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to open file");
      } finally {
        setRunningId(null);
      }
      return;
    }
    if (row.kind === "task") { router.push("/editor/tasks"); close(); return; }
    if (row.kind === "heading") {
      activeEditorView?.dispatch({ selection: { anchor: row.from }, effects: EditorView.scrollIntoView(row.from, { y: "start", yMargin: 16 }) });
      activeEditorView?.focus(); close(); return;
    }
    if (row.command.disabledReason) return;
    markUsed(row.id);
    setRunningId(row.id);
    try {
      await row.command.action();
      if (row.command.closeOnRun !== false) close();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : `Failed to run ${row.label}`);
    } finally {
      setRunningId(null);
    }
  };

  const togglePin = (row: Row | undefined) => {
    if (!row || (row.kind !== "file" && row.kind !== "command")) return;
    const item: PalettePinnedItem = { kind: row.kind, id: row.id };
    setPinnedItems((previous) => {
      const exists = previous.some((candidate) => pinnedKey(candidate) === pinnedKey(item));
      if (exists) return previous.filter((candidate) => pinnedKey(candidate) !== pinnedKey(item));
      if (previous.length >= MAX_PINS) {
        showErrorToast(`You can pin up to ${MAX_PINS} items`);
        return previous;
      }
      return [...previous, item];
    });
    setContextRow(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault(); togglePin(rows[selectedIndex]); return;
    }
    if (event.key === "ArrowDown") { event.preventDefault(); setSelectedIndex((index) => rows.length ? (index + 1) % rows.length : 0); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setSelectedIndex((index) => rows.length ? (index - 1 + rows.length) % rows.length : 0); return; }
    if (event.key === "Enter") {
      event.preventDefault();
      void execute(rows[selectedIndex]);
    }
  };

  const isPinned = (row: Row) => (row.kind === "file" || row.kind === "command") && pinnedItems.some((item) => pinnedKey(item) === `${row.kind}:${row.id}`);
  const rowHeight = isMobileChrome ? "min-h-11" : "min-h-10";
  const displayQuery = scope ? `${scopePrefix(scope)}${query}` : query;
  const resultContext = (row: Row, duplicateNames: Set<string>) => {
    if (row.kind === "command") return row.command.disabledReason;
    if (row.kind === "task") return row.detail;
    if (row.kind === "file" && (scope === "tag" || duplicateNames.has(row.label))) return row.detail;
    return null;
  };
  const duplicateNames = new Set(rows.filter((row) => row.kind === "file").map((row) => row.label)
    .filter((label, index, labels) => labels.indexOf(label) !== index));

  return <OverlayPanel isOpen={isOpen} onClose={close} variant={isMobileChrome ? "sheet" : "modal"} backdrop="dim"
    backdropClassName={isOpen
      ? "bg-surface/85 dark:bg-black/60 animate-in fade-in duration-overlay-backdrop motion-reduce:animate-none"
      : "bg-surface/85 dark:bg-black/60 animate-out fade-out duration-overlay-backdrop motion-reduce:animate-none"}
    exitDurationMs={200}
    containerClassName={isMobileChrome ? "" : "items-start justify-center pt-[18vh] px-4"}
    panelClassName={isMobileChrome
      ? `flex-1 flex flex-col bg-overlay duration-overlay-panel motion-reduce:animate-none ${isOpen ? "animate-in fade-in slide-in-from-bottom-2 ease-out" : "animate-out fade-out slide-out-to-bottom-2 ease-in"}`
      : `w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-18vh-2rem)] flex flex-col bg-gradient-to-b from-overlay via-overlay to-surface-raised border border-edge rounded-lg overflow-hidden duration-overlay-panel motion-reduce:animate-none ${isOpen ? "animate-in fade-in slide-in-from-top-1 ease-out" : "animate-out fade-out slide-out-to-top-1 ease-in"}`}>
    <div className="flex h-16 items-center gap-2 border-b border-edge bg-gradient-to-b from-surface/60 to-transparent px-6 font-sans">
        <div className="flex flex-1 items-center gap-3">
          <HiOutlineSearch size={14} className="shrink-0 text-fg-muted" />
          <input ref={inputRef} type="search" value={displayQuery} onChange={(event) => { const value = event.target.value; const parsed = scopeFromPrefix(value); setScope(parsed?.scope ?? null); setQuery(parsed?.query ?? value); }} onKeyDown={handleKeyDown}
            placeholder="Search files or type a command..." className="min-w-0 flex-1 bg-transparent text-ui-callout font-normal text-fg outline-none caret-accent placeholder:text-fg-faint [&::-webkit-search-cancel-button]:hidden"
            autoComplete="off" autoCorrect="off" spellCheck={false} role="combobox" aria-label="Search files and command palette modes" aria-expanded={isOpen} aria-controls="command-palette-results" aria-activedescendant={rows[selectedIndex] ? `command-palette-option-${selectedIndex}` : undefined} />
          {query && <Button variant="icon" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear search" className="!w-8 !h-8"><HiOutlineX size={16} /></Button>}
        </div>
        {isMobileChrome && <Button variant="icon" onClick={close} aria-label="Close" className="shrink-0"><HiOutlineX size={20} /></Button>}
    </div>
    <div id="command-palette-results" role="listbox" aria-label="Command palette results" className="flex-1 min-h-0 overflow-y-auto" style={{ fontFamily }}>
      {rows.length === 0 && !query && !scope && (
        <div className="animate-in fade-in slide-in-from-top-1 px-6 py-8 text-center text-ui-footnote text-fg-muted duration-200 motion-reduce:animate-none">
          <p className="font-medium text-fg">Start typing to find a note or action.</p>
          <p className="mt-1">Use # for tags, &gt; for commands, ! for tasks, or @ for headings.</p>
        </div>
      )}
      {rows.length === 0 && (query || scope) && (
        <div className="animate-in fade-in slide-in-from-top-1 px-6 py-8 text-center duration-200 motion-reduce:animate-none">
          <span aria-hidden="true" className="text-lg">🪴</span>
          <p className="mt-2 text-ui-footnote text-fg">No matches found</p>
          <p className="mt-1 text-ui-footnote text-fg-muted">Try a file name, #tag, &gt;command, !task, or @heading.</p>
        </div>
      )}
      <div className="py-2">{rows.map((row, index) => {
        const selected = index === selectedIndex;
        const context = resultContext(row, duplicateNames);
        return <Button key={`${row.kind}:${row.id}`} variant="menu-item" id={`command-palette-option-${index}`} role="option" aria-label={context ? `${row.label} ${context}` : row.label} aria-selected={selected} aria-disabled={row.kind === "command" && !!row.command.disabledReason}
          isDisabled={runningId !== null || (row.kind === "command" && !!row.command.disabledReason)} onClick={() => void execute(row)} onMouseEnter={() => setSelectedIndex(index)} onContextMenu={(event: React.MouseEvent) => { if (row.kind === "file" || row.kind === "command") { event.preventDefault(); setContextRow(row); } }}
          className={`mx-2 w-[calc(100%-1rem)] !rounded-md ${rowHeight} justify-between gap-3 px-3 text-left font-normal hover:bg-surface-raised ${selected ? "bg-surface-raised text-fg" : ""}`}>
          <span className="min-w-0 truncate"><HighlightedText text={row.label} indices={row.titleIndices} />{context && <span className="ml-2 text-ui-footnote text-fg-muted"><HighlightedText text={context} indices={row.detailIndices} /></span>}</span>
          {row.kind === "command" && row.command.shortcut && <span className="shrink-0 font-mono text-ui-micro text-fg-muted">{row.command.shortcut}</span>}
        </Button>;
      })}</div>
    </div>
    {contextRow && <div role="menu" aria-label="Palette item actions" className="absolute right-3 top-28 z-10 animate-in fade-in zoom-in-95 slide-in-from-top-1 rounded-lg border border-edge bg-chrome p-1 shadow-lg duration-150 motion-reduce:animate-none"><Button variant="menu-item" role="menuitem" onClick={() => togglePin(contextRow)}>{isPinned(contextRow) ? "Unpin item" : "Pin item"} <span className="ml-auto text-fg-faint">Ctrl+D</span></Button></div>}
  </OverlayPanel>;
}
