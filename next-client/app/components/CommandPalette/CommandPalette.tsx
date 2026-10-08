"use client";

import { atom_visibleTasks } from "@/app/atoms/task-atoms";
import { atom_activeEditorView, atom_commandUseCounts, atom_editorFontFamily, atom_palettePinnedItems, atom_pendingScrollTarget, atom_recentFilePaths, atom_showHiddenFiles, atom_theme, type PalettePinnedItem } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import { showErrorToast } from "@/app/components/Toastr";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useContentIndexSync } from "@/app/hooks/file-system/use-content-index-sync";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { nextPaint } from "@/app/utils/next-paint";
import { formatShortcut } from "@/app/utils/platform";
import { EditorView } from "@codemirror/view";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineCog, HiOutlineX } from "react-icons/hi";
import { version } from "../../../package.json";
import { fuzzyMatch, matchCommand, matchFile } from "./command-search";
import { type Command, useCommandPalette } from "./CommandPaletteContext";
import PaletteSearchBar from "./PaletteSearchBar";
import PaletteRow from "./PaletteRow";
import { usePaletteContentSearch } from "./use-palette-content-search";
import { usePaletteFiles } from "./use-palette-files";
import { buildCreateRow, buildTaskRows, SEARCH_OR_CREATE_PLACEHOLDER, COMMAND_MODE_DEFAULT_ORDER, MAX_PINS, MAX_VISIBLE_ROWS, pinnedKey, type Row, type Scope, scopeFromPrefix, scopePrefix, type TaggedFileMatch, THEME_CYCLE } from "./palette-model";

export default function CommandPalette() {
  const { isOpen, initialQuery, close, commands, markUsed, createNote, isMorphing } = useCommandPalette();
  const tasks = useAtomValue(atom_visibleTasks);
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const fontFamily = useAtomValue(atom_editorFontFamily);
  const commandUseCounts = useAtomValue(atom_commandUseCounts);
  const [recentFilePaths, setRecentFilePaths] = useAtom(atom_recentFilePaths);
  const [pinnedItems, setPinnedItems] = useAtom(atom_palettePinnedItems);
  const [theme, setTheme] = useAtom(atom_theme);
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);
  const { openFile } = useFileSystem();
  const router = useRouter();
  const pathname = usePathname();
  const isMobileChrome = useIsMobileChrome();
  const themeCycleIndex = THEME_CYCLE.findIndex((entry) => entry.value === theme);
  const { label: themeCycleLabel, Icon: ThemeCycleIcon } = THEME_CYCLE[themeCycleIndex];
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
    shortcut: formatShortcut("E", { shift: true }),
    keywords: "files navigator tree browse",
    action: () => router.push("/editor/files"),
  }), [router]);
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

  const { files, filesByTag, existingFiles } = usePaletteFiles(showHiddenFiles);
  useContentIndexSync();
  const contentSearch = usePaletteContentSearch(isOpen && scope === "content", query, files);

  const scopedRows = useMemo<Row[]>(() => {
    // The `/` scope's rows come from the worker (usePaletteContentSearch).
    if (!scope || scope === "content") return [];
    if (scope === "command") {
      return paletteCommands.map((command) => {
        const match = matchCommand(query, command);
        return match ? {
          kind: "command" as const, id: command.id, label: command.label,
          detail: command.disabledReason ?? command.category ?? "Command", command,
          titleIndices: match.indices, detailIndices: [] as number[], score: match.score,
        } : null;
      }).filter((row): row is Extract<Row, { kind: "command" }> => row !== null)
        .sort((a, b) => {
          if (!query) {
            const useCountDifference = (commandUseCounts[b.id] ?? 0) - (commandUseCounts[a.id] ?? 0);
            if (useCountDifference) return useCountDifference;

            const aDefaultIndex = COMMAND_MODE_DEFAULT_ORDER.indexOf(a.id);
            const bDefaultIndex = COMMAND_MODE_DEFAULT_ORDER.indexOf(b.id);
            const defaultOrderDifference =
              (aDefaultIndex === -1 ? Number.MAX_SAFE_INTEGER : aDefaultIndex)
              - (bDefaultIndex === -1 ? Number.MAX_SAFE_INTEGER : bDefaultIndex);
            if (defaultOrderDifference) return defaultOrderDifference;
          }

          return b.score - a.score || a.label.localeCompare(b.label);
        });
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
      return buildTaskRows(query, tasks);
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
  }, [activeEditorView, commandUseCounts, filesByTag, paletteCommands, query, scope, tasks]);

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

  const createRow = useMemo(
    () => (scope || !createNote ? null : buildCreateRow(query, existingFiles)),
    [createNote, existingFiles, query, scope],
  );

  const rows = useMemo(() => {
    if (scope === "content") return contentSearch.rows.slice(0, MAX_VISIBLE_ROWS);
    if (scope) return scopedRows.slice(0, MAX_VISIBLE_ROWS);
    if (query) return createRow ? [...fileRows.slice(0, MAX_VISIBLE_ROWS - 1), createRow] : fileRows;
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
  }, [commandUseCounts, contentSearch.rows, createRow, explorerCommand.id, fileRows, paletteCommands, pinnedItems, query, recentFilePaths, resolvePinned, scope, scopedRows]);

  useEffect(() => setSelectedIndex(0), [query, scope]);
  useEffect(() => setSelectedIndex((index) => Math.min(index, Math.max(0, rows.length - 1))), [rows.length]);

  const execute = async (row: Row | undefined) => {
    if (!row || runningId) return;
    if (row.kind === "file" || row.kind === "content") {
      // Close first and let that paint: reading the file and re-rendering the
      // editor can block the main thread, and a palette frozen on screen feels
      // like the app hung. The editor shows its own loading bar meanwhile.
      close();
      await nextPaint();
      try {
        await openFile(row.file.handle, row.file.path);
        setRecentFilePaths((previous) => [row.file.path, ...previous.filter((path) => path !== row.file.path)].slice(0, 5));
        // Note-text results put the caret on the first match in their line.
        if (row.kind === "content") setPendingScrollTarget({ path: row.file.path, line: row.line, column: row.column });
        if (!pathname.startsWith("/editor")) router.push("/editor");
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to open file");
      }
      return;
    }
    if (row.kind === "create") {
      close();
      await nextPaint();
      try {
        await createNote?.(row.title);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to create note");
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
    if (event.key === "Tab") {
      event.preventDefault();
      setSelectedIndex((index) => rows.length ? (index + (event.shiftKey ? rows.length - 1 : 1)) % rows.length : 0);
      inputRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") { event.preventDefault(); setSelectedIndex((index) => rows.length ? (index + 1) % rows.length : 0); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setSelectedIndex((index) => rows.length ? (index - 1 + rows.length) % rows.length : 0); return; }
    if (event.key === "Enter") {
      event.preventDefault();
      void execute(rows[selectedIndex]);
    }
  };

  const isPinned = (row: Row) => (row.kind === "file" || row.kind === "command") && pinnedItems.some((item) => pinnedKey(item) === `${row.kind}:${row.id}`);
  const displayQuery = scope ? `${scopePrefix(scope)}${query}` : query;
  const contentMessage = scope !== "content" ? null
    : contentSearch.status === "unavailable" ? "Note text search isn't available in this browser."
      : contentSearch.status === "short" ? "Type at least 2 characters to search note text." : null;
  const contentFootnote = scope !== "content" || contentSearch.status === "unavailable" ? null
    : contentSearch.capped ? "Note text search covers part of this vault (size limit reached)."
      : contentSearch.pending > 0 ? `Indexing note text… ${contentSearch.pending} note${contentSearch.pending === 1 ? "" : "s"} left` : null;
  const showsEmptyState = rows.length === 0 && !!(query || scope) && !contentMessage && !(scope === "content" && contentSearch.status === "searching");

  return <OverlayPanel isOpen={isOpen} onClose={close} variant={isMobileChrome ? "sheet" : "modal"} backdrop="dim"
    // During a search-pill morph the view transition animates; the panel's own
    // enter/exit animations and exit delay would hide it, so they're skipped.
    backdropClassName={`bg-surface/85 dark:bg-black/60 duration-overlay-backdrop motion-reduce:animate-none ${isMorphing ? "" : isOpen ? "animate-in fade-in" : "animate-out fade-out"}`}
    exitDurationMs={isMorphing ? 0 : 200}
    containerClassName={isMobileChrome ? "" : "items-start justify-center pt-[18vh] px-4"}
    panelClassName={isMobileChrome
      ? `flex-1 flex flex-col bg-overlay duration-overlay-panel motion-reduce:animate-none ${isMorphing ? "" : isOpen ? "animate-in fade-in slide-in-from-bottom-2 ease-out" : "animate-out fade-out slide-out-to-bottom-2 ease-in"}`
      : `w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-18vh-2rem)] flex flex-col bg-gradient-to-b from-overlay via-overlay to-surface-raised border border-edge rounded-2xl overflow-hidden duration-overlay-panel motion-reduce:animate-none ${isMorphing ? "" : isOpen ? "animate-in fade-in slide-in-from-top-1 ease-out" : "animate-out fade-out slide-out-to-top-1 ease-in"}`}>
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={handleKeyDown}>
    <PaletteSearchBar
      inputRef={inputRef}
      isOpen={isOpen}
      value={displayQuery}
      placeholder={createNote ? SEARCH_OR_CREATE_PLACEHOLDER : "Search files or type a command..."}
      hasQuery={!!query}
      isCommandMode={scope === "command"}
      activeDescendant={rows[selectedIndex] ? `command-palette-option-${selectedIndex}` : undefined}
      onChange={(value) => { const parsed = scopeFromPrefix(value); setScope(parsed?.scope ?? null); setQuery(parsed?.query ?? value); }}
      onClear={() => { setQuery(""); inputRef.current?.focus(); }}
      onToggleCommands={() => { setScope((current) => (current === "command" ? null : "command")); inputRef.current?.focus(); }}
    >
      {isMobileChrome && <Button variant="icon" onClick={close} aria-label="Close" className="shrink-0"><HiOutlineX size={20} /></Button>}
    </PaletteSearchBar>
    <div id="command-palette-results" role="listbox" aria-label="Command palette results" className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto" style={{ fontFamily }}>
      {rows.length === 0 && !query && !scope && (
        <div className="animate-in fade-in slide-in-from-top-1 px-6 py-8 text-center text-ui-footnote text-fg-muted duration-200 motion-reduce:animate-none">
          <p className="font-medium text-fg">Start typing to find a note or action.</p>
          <p className="mt-1">Use # for tags, &gt; for commands, ! for tasks, @ for headings, or / for note text.</p>
        </div>
      )}
      {contentMessage && <p className="px-6 py-8 text-center text-ui-footnote text-fg-muted">{contentMessage}</p>}
      {showsEmptyState && (
        <div className="animate-in fade-in slide-in-from-top-1 px-6 py-8 text-center duration-200 motion-reduce:animate-none">
          <span aria-hidden="true" className="text-lg">🪴</span>
          <p className="mt-2 text-ui-footnote text-fg">No matches found</p>
          <p className="mt-1 text-ui-footnote text-fg-muted">Try a file name, #tag, &gt;command, !task, @heading, or /note text.</p>
        </div>
      )}
      <div className="py-2">{rows.map((row, index) => (
        <PaletteRow key={`${row.kind}:${row.id}`} row={row} index={index} selected={index === selectedIndex} scope={scope} runningId={runningId} isMobileChrome={isMobileChrome}
          onExecute={(target) => void execute(target)} onHover={setSelectedIndex} onContextMenu={setContextRow} />
      ))}</div>
      {contentFootnote && <p className="px-5 pb-2 text-ui-footnote text-fg-muted">{contentFootnote}</p>}
    </div>
    <footer className="flex items-center justify-between border-t border-edge-subtle bg-chrome px-3 py-1 text-ui-caption text-fg-muted dark:bg-overlay">
      <div className="flex items-center gap-0.5">
        <Button variant="icon" onClick={() => setTheme(THEME_CYCLE[(themeCycleIndex + 1) % THEME_CYCLE.length].value)} aria-label={themeCycleLabel} title={themeCycleLabel} className="!w-7 !h-7" suppressHydrationWarning>
          <ThemeCycleIcon size={14} />
        </Button>
        <Button variant="icon" onClick={() => { router.push("/editor/settings"); close(); }} aria-label="Settings" title="Settings" className="!w-7 !h-7">
          <HiOutlineCog size={14} />
        </Button>
      </div>
      <span className="font-medium">HermesMarkdown v{version}</span>
    </footer>
    {contextRow && <div role="menu" aria-label="Palette item actions" className="absolute right-3 top-28 z-10 animate-in fade-in zoom-in-95 slide-in-from-top-1 rounded-lg border border-edge bg-chrome p-1 shadow-lg duration-150 motion-reduce:animate-none"><Button variant="menu-item" role="menuitem" onClick={() => togglePin(contextRow)}>{isPinned(contextRow) ? "Unpin item" : "Pin item"} <span className="ml-auto text-fg-faint">Ctrl+D</span></Button></div>}
    </div>
  </OverlayPanel>;
}
