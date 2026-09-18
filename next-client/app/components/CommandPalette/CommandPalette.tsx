"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_customWorkspaces } from "@/app/atoms/metadata";
import { atom_allTasks } from "@/app/atoms/task-atoms";
import {
  atom_activeEditorView,
  atom_railPanel,
  atom_recentFilePaths,
  atom_selectedFileTags,
  atom_selectedWorkspaceId,
  atom_showHiddenFiles,
} from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useCommandPalette, type Command } from "./CommandPaletteContext";
import { fuzzyMatch, matchCommand } from "./command-search";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { HiOutlineInformationCircle, HiOutlineSearch, HiOutlineX, HiOutlineTerminal } from "react-icons/hi";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import Button from "@/app/components/Button";
import { showErrorToast } from "@/app/components/Toastr";
import { EditorView } from "@codemirror/view";

const ROW_HEIGHT = 36;
const MAX_VISIBLE_ROWS = 12;

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
  | { kind: "command"; command: Command; indices: number[]; score: number }
  | { kind: "file"; file: FileResult; indices: number[]; detail?: string; score: number }
  | { kind: "tag"; id: string; label: string; count: number; indices: number[]; score: number }
  | { kind: "task"; id: string; label: string; path: string; line: number; handle: FileSystemFileHandle; indices: number[]; score: number }
  | { kind: "view"; id: string; label: string; indices: number[]; score: number }
  | { kind: "heading"; label: string; level: number; from: number; indices: number[]; score: number };

// Plain quick-open searches file names and paths only. Tags are first-class
// results in the dedicated "#" mode below.
function matchFile(query: string, file: FileResult): { score: number; indices: number[] } | null {
  const nameMatch = fuzzyMatch(query, file.name);
  if (nameMatch) return nameMatch;

  const pathMatch = fuzzyMatch(query, file.path);
  if (pathMatch) return { score: pathMatch.score, indices: [] };
  return null;
}

export default function CommandPalette() {
  const { isOpen, close, commands, recentCommandIds, markUsed } = useCommandPalette();
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const tasks = useAtomValue(atom_allTasks);
  const customWorkspaces = useAtomValue(atom_customWorkspaces);
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const [recentFilePaths, setRecentFilePaths] = useAtom(atom_recentFilePaths);
  const [, setRailPanel] = useAtom(atom_railPanel);
  const [, setSelectedWorkspaceId] = useAtom(atom_selectedWorkspaceId);
  const [, setSelectedFileTags] = useAtom(atom_selectedFileTags);
  const { openFile } = useFileSystem();
  const router = useRouter();
  const pathname = usePathname();
  const isMobileChrome = useIsMobileChrome();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [runningId, setRunningId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const fileResults: FileResult[] = useMemo(
    () =>
      Object.values(fileMetadata)
        .filter((m) => showHiddenFiles || !m.path.split("/").some((seg) => seg.startsWith("_")))
        .map((m) => ({ path: m.path, name: m.name, handle: m.handle, tags: m.tags })),
    [fileMetadata, showHiddenFiles],
  );

  // VSCode-style prefixes: ">" switches to the command list, "#" searches
  // tags exclusively (handled inside matchFile); a bare query is a file
  // search by name/path, matching the app's default "quick open" behavior.
  const isCommandMode = query.startsWith(">");
  const isTagMode = query.startsWith("#");
  const isTaskMode = query.startsWith("!");
  const isViewMode = query.startsWith("%");
  const isHeadingMode = query.startsWith(":");
  const hasSmartPrefix = isCommandMode || isTagMode || isTaskMode || isViewMode || isHeadingMode;
  const searchQuery = hasSmartPrefix ? query.slice(1).trimStart() : query.trim();

  const commandRows: Row[] = useMemo(() => {
    if (!isCommandMode) return [];
    if (!searchQuery) {
      const byRecent = [...commands].sort((a, b) => {
        const ai = recentCommandIds.indexOf(a.id);
        const bi = recentCommandIds.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
      return byRecent.slice(0, MAX_VISIBLE_ROWS).map((command, index) => ({
        kind: "command" as const,
        command,
        indices: [],
        score: 500 - index,
      }));
    }
    return commands
      .map((command) => {
        const match = matchCommand(searchQuery, command);
        const recentIndex = recentCommandIds.indexOf(command.id);
        return match
          ? { command, score: match.score + (recentIndex === -1 ? 0 : 40 - recentIndex), indices: match.indices }
          : null;
      })
      .filter((r): r is { command: Command; score: number; indices: number[] } => r !== null)
      .sort((a, b) => b.score - a.score || a.command.label.localeCompare(b.command.label))
      .map((r) => ({ kind: "command" as const, ...r }));
  }, [commands, searchQuery, isCommandMode, recentCommandIds]);

  const fileRows: Row[] = useMemo(() => {
    if (isCommandMode || isTagMode || isTaskMode || isViewMode || isHeadingMode) return [];
    const q = searchQuery;
    if (!q) {
      return fileResults
        .slice()
        .sort((a, b) => {
          const ai = recentFilePaths.indexOf(a.path);
          const bi = recentFilePaths.indexOf(b.path);
          if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          return a.name.localeCompare(b.name);
        })
        .slice(0, 7)
        .map((file, index) => ({
          kind: "file" as const,
          file,
          indices: [],
          score: 400 - index,
        }));
    }
    return fileResults
      .map((file) => {
        const match = matchFile(q, file);
        return match ? { file, score: match.score, indices: match.indices } : null;
      })
      .filter((r): r is { file: FileResult; score: number; indices: number[] } => r !== null)
      .map((result) => ({
        ...result,
        score: result.score + (recentFilePaths.includes(result.file.path) ? 30 : 0),
      }))
      .sort((a, b) => b.score - a.score || a.file.name.localeCompare(b.file.name))
      .map((r) => ({
        kind: "file" as const,
        file: r.file,
        indices: r.indices,
        score: r.score,
      }));
  }, [fileResults, searchQuery, isCommandMode, isHeadingMode, isTagMode, isTaskMode, isViewMode, recentFilePaths]);

  const tagRows: Row[] = useMemo(() => {
    if (!isTagMode) return [];
    const counts = new Map<string, number>();
    for (const metadata of Object.values(fileMetadata)) {
      for (const rawTag of metadata.tags) {
        const tag = rawTag.replace(/^#/, "").trim().toLowerCase();
        if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts, ([label, count]) => {
      const match = fuzzyMatch(searchQuery, label);
      return match
        ? { kind: "tag" as const, id: label, label, count, indices: match.indices, score: match.score }
        : null;
    })
      .filter((row): row is Extract<Row, { kind: "tag" }> => row !== null)
      .sort((a, b) => b.score - a.score || b.count - a.count || a.label.localeCompare(b.label));
  }, [fileMetadata, isTagMode, searchQuery]);

  const taskRows: Row[] = useMemo(() => {
    if (!isTaskMode) return [];
    return tasks
      .map((task) => {
        const match = fuzzyMatch(searchQuery, `${task.text} ${task.path} ${task.tags.join(" ")}`);
        const handle = fileMetadata[task.path]?.handle as FileSystemFileHandle | undefined;
        return match && handle
          ? { kind: "task" as const, id: task.id, label: task.text || "(empty task)", path: task.path, line: task.line, handle, indices: match.indices, score: match.score }
          : null;
      })
      .filter((row): row is Extract<Row, { kind: "task" }> => row !== null)
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  }, [fileMetadata, isTaskMode, searchQuery, tasks]);

  const viewRows: Row[] = useMemo(() => {
    if (!isViewMode) return [];
    return [{ id: "today", name: "Today's Work" }, ...customWorkspaces]
      .map((workspace) => {
        const match = fuzzyMatch(searchQuery, workspace.name);
        return match
          ? { kind: "view" as const, id: workspace.id, label: workspace.name, indices: match.indices, score: match.score }
          : null;
      })
      .filter((row): row is Extract<Row, { kind: "view" }> => row !== null)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  }, [customWorkspaces, isViewMode, searchQuery]);

  const headingRows: Row[] = useMemo(() => {
    if (!isHeadingMode || !activeEditorView) return [];
    const headings: Extract<Row, { kind: "heading" }>[] = [];
    for (let lineNumber = 1; lineNumber <= activeEditorView.state.doc.lines; lineNumber++) {
      const line = activeEditorView.state.doc.line(lineNumber);
      const heading = /^(#{1,6})\s+(.+)$/.exec(line.text);
      if (!heading) continue;
      const match = fuzzyMatch(searchQuery, heading[2]);
      if (match) headings.push({ kind: "heading", label: heading[2], level: heading[1].length, from: line.from, indices: match.indices, score: match.score });
    }
    return headings.sort((a, b) => b.score - a.score || a.from - b.from);
  }, [activeEditorView, isHeadingMode, searchQuery]);

  const rows: Row[] = useMemo(
    () => (
      isCommandMode ? commandRows :
        isTagMode ? tagRows :
          isTaskMode ? taskRows :
            isViewMode ? viewRows :
              isHeadingMode ? headingRows :
                fileRows
    ).slice(0, MAX_VISIBLE_ROWS),
    [commandRows, fileRows, headingRows, isCommandMode, isHeadingMode, isTagMode, isTaskMode, isViewMode, tagRows, taskRows, viewRows],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  const execute = async (index: number) => {
    const row = rows[index];
    if (!row || runningId) return;
    if (row.kind === "file") {
      setRunningId(`file:${row.file.path}`);
      try {
        await openFile(row.file.handle, row.file.path);
        setRecentFilePaths((previous) => [
          row.file.path,
          ...previous.filter((path) => path !== row.file.path),
        ].slice(0, 8));
        if (!pathname.startsWith("/editor")) router.push("/editor");
        close();
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to open file");
      } finally {
        setRunningId(null);
      }
      return;
    }
    if (row.kind === "task") {
      router.push("/editor/tasks");
      close();
    }
    if (row.kind === "view") {
      setSelectedWorkspaceId(row.id);
      setRailPanel("views");
      if (!pathname.startsWith("/editor")) router.push("/editor");
      close();
      return;
    }
    if (row.kind === "tag") {
      setSelectedFileTags([row.label]);
      setRailPanel("search");
      if (!pathname.startsWith("/editor")) router.push("/editor");
      close();
      return;
    }
    if (row.kind === "heading") {
      if (!activeEditorView) return;
      activeEditorView.dispatch({
        selection: { anchor: row.from },
        effects: EditorView.scrollIntoView(row.from, { y: "start", yMargin: 16 }),
      });
      activeEditorView.focus();
      close();
      return;
    }
    if (row.command.disabledReason) return;
    markUsed(row.command.id);
    setRunningId(row.command.id);
    try {
      await row.command.action();
      if (row.command.closeOnRun !== false) close();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : `Failed to run ${row.command.label}`);
    } finally {
      setRunningId(null);
    }
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
      void execute(selectedIndex);
    }
    // Escape is handled globally by OverlayPanel's useOverlayDismissal.
  };

  const rowHeightClass = isMobileChrome ? "min-h-11" : "h-9";

  return (
    <OverlayPanel
      isOpen={isOpen}
      onClose={close}
      variant={isMobileChrome ? "sheet" : "modal"}
      backdrop="dim"
      backdropClassName={`transition-opacity duration-overlay-backdrop ${isOpen ? "opacity-100" : "opacity-0"}`}
      exitDurationMs={100}
      containerClassName={isMobileChrome ? "" : "items-start justify-center pt-[18vh] px-4"}
      panelClassName={
        isMobileChrome
          ? "flex-1 flex flex-col bg-chrome animate-in slide-in-from-bottom duration-overlay-panel"
          : "w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-18vh-2rem)] flex flex-col bg-chrome border border-edge rounded-2xl overflow-hidden"
      }
    >
      <div className="p-2 border-b border-b-edge">
        <div
          id="command-palette-search-help"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 pb-1.5 text-ui-micro text-fg-muted"
        >
          <HiOutlineInformationCircle size={13} className="shrink-0" />
          <span className="font-medium text-fg">Search notes</span>
          <span className="hidden sm:inline text-fg-faint">or narrow by</span>
          <span className="inline-flex flex-wrap items-center gap-1">
            {[
              ["#", "tags"],
              [">", "commands"],
              ["!", "tasks"],
              ["%", "views"],
              [":", "headings"],
            ].map(([prefix, label]) => (
              <span
                key={prefix}
                className="inline-flex items-center gap-0.5 rounded-md bg-paper-softgray px-1.5 py-0.5 dark:bg-paper-dark-surface"
              >
                <strong className="font-mono text-fg">{prefix}</strong>
                <span>{label}</span>
              </span>
            ))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center h-11 sm:h-9 px-3 gap-2 rounded-xl border border-edge bg-paper-light dark:bg-paper-dark focus-within:ring-2 focus-within:ring-sage/20 transition-all duration-150">
            <HiOutlineSearch size={15} className="shrink-0 text-fg-faint" />
            <input
              ref={inputRef}
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search files"
              className="flex-1 min-w-0 bg-transparent text-fg text-[15px] outline-none focus-visible:outline-none caret-accent [&::-webkit-search-cancel-button]:hidden"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore
              data-bwignore="true"
              data-nordpass-ignore="true"
              role="combobox"
              aria-label="Search files and command palette modes"
              aria-describedby="command-palette-search-help"
              aria-expanded={isOpen}
              aria-controls="command-palette-results"
              aria-activedescendant={rows[selectedIndex] ? `command-palette-option-${selectedIndex}` : undefined}
            />
            {query && (
              <Button
                variant="icon"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="shrink-0 !w-8 !h-8 !rounded-lg text-fg-faint hover:text-fg-muted"
              >
                <HiOutlineX size={16} />
              </Button>
            )}
            {/* Tap equivalent of typing ">" to reach command mode (see
              isCommandMode below) — most useful on mobile, where touch
              keyboards bury ">" behind a symbols layer, but shown on
              desktop too as a discoverable, mouse-friendly alternative to
              remembering the prefix. */}
            <Button
              variant="icon"
              onClick={() => {
                setQuery((q) => (q.startsWith(">") ? q.slice(1).trimStart() : `>${q}`));
                inputRef.current?.focus();
              }}
              aria-label={isCommandMode ? "Switch to file search" : "Switch to commands"}
              aria-pressed={isCommandMode}
              className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isCommandMode ? "bg-sage/10 text-sage" : "text-fg-faint hover:text-fg-muted"
                }`}
            >
              <HiOutlineTerminal size={16} />
            </Button>
          </div>
          {isMobileChrome && (
            <Button
              variant="icon"
              onClick={close}
              aria-label="Close"
              className="shrink-0 w-11 h-11 flex items-center justify-center text-fg-muted"
            >
              <HiOutlineX size={20} />
            </Button>
          )}
        </div>
      </div>
      <div
        id="command-palette-results"
        role="listbox"
        aria-label="Command palette results"
        className="flex-1 min-h-0 overflow-y-auto"
        style={!isMobileChrome ? { maxHeight: ROW_HEIGHT * MAX_VISIBLE_ROWS } : undefined}
      >
        {rows.length === 0 && (
          <div className="flex items-center justify-center h-9 text-ui-footnote text-fg-muted">No results</div>
        )}
        {rows.map((row, index) => {
          const key =
            row.kind === "command" ? row.command.id :
              row.kind === "file" ? row.file.path :
                row.kind === "heading" ? `heading:${row.from}` :
                  `${row.kind}:${row.id}`;
          const isSelected = index === selectedIndex;
          return (
            <Button
              variant="menu-item"
              key={key}
              id={`command-palette-option-${index}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={row.kind === "command" && !!row.command.disabledReason}
              isDisabled={runningId !== null || (row.kind === "command" && !!row.command.disabledReason)}
              onClick={() => void execute(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`relative w-full flex items-center justify-between gap-3 pl-10 pr-4 ${rowHeightClass} text-left text-[14px] cursor-pointer select-none ${isSelected ? "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-accent bg-accent/10 text-fg" : "text-fg"
                }`}
            >
              {row.kind === "command" ? (
                <>
                  <span className="truncate">
                    <HighlightedText text={row.command.label} indices={row.indices} />
                  </span>
                  <span className="shrink-0 flex items-center gap-2 text-ui-micro text-fg-muted">
                    {row.command.disabledReason ?? row.command.category ?? "Command"}
                    {row.command.shortcut && !isMobileChrome && <span className="font-mono">{row.command.shortcut}</span>}
                  </span>
                </>
              ) : row.kind === "file" ? (
                <>
                  <span className="truncate">
                    <HighlightedText text={row.file.name} indices={row.indices} />
                  </span>
                  <span className="shrink-0 truncate text-ui-micro text-fg-muted">
                    {row.detail ?? row.file.path}
                  </span>
                </>
              ) : row.kind === "tag" ? (
                <>
                  <span className="truncate">
                    #<HighlightedText text={row.label} indices={row.indices} />
                  </span>
                  <span className="shrink-0 truncate text-ui-micro text-fg-muted">
                    {row.count} {row.count === 1 ? "note" : "notes"}
                  </span>
                </>
              ) : (
                <>
                  <span className="truncate">
                    <HighlightedText text={row.label} indices={row.indices} />
                  </span>
                  <span className="shrink-0 truncate text-ui-micro text-fg-muted">
                    {row.kind === "task" ? `${row.path}:${row.line + 1}` : row.kind === "heading" ? `H${row.level}` : "View"}
                  </span>
                </>
              )}
            </Button>
          );
        })}
      </div>
    </OverlayPanel>
  );
}
