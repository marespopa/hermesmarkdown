"use client";

import { atom_visibleTasks } from "@/app/atoms/task-atoms";
import { atom_templates } from "@/app/atoms/template-atoms";
import { atom_activeEditorView, atom_commandUseCounts, atom_editorFontFamily, atom_pendingScrollTarget, atom_recentFilePaths, atom_searchRegex, atom_showHiddenFiles, type PalettePinnedItem } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import { showErrorToast } from "@/app/components/Toastr";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useContentIndexSync } from "@/app/hooks/file-system/use-content-index-sync";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { useShowFiles } from "@/app/hooks/use-show-files";
import { editorReplaceHref } from "@/app/editor/utils/editor-url";
import { nextPaint } from "@/app/utils/next-paint";
import { formatShortcut } from "@/app/utils/platform";
import { EditorView } from "@codemirror/view";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineChevronLeft, HiOutlineX } from "react-icons/hi";
import { fuzzyMatch, matchCommand, matchFile } from "./command-search";
import { type Command, useCommandPalette } from "./CommandPaletteContext";
import PaletteFooter from "./PaletteFooter";
import PaletteSearchBar from "./PaletteSearchBar";
import PaletteRow from "./PaletteRow";
import { usePaletteContentSearch } from "./use-palette-content-search";
import { usePaletteFiles } from "./use-palette-files";
import { usePalettePins } from "./use-palette-pins";
import { buildCreateRow, buildMenuRows, buildTagRows, buildTaskRows, buildTemplateRows, commandRow, SEARCH_OR_CREATE_PLACEHOLDER, MAX_VISIBLE_ROWS, pinnedKey, rowGroup, type Row, type Scope, scopeFromPrefix, scopePrefix, TOP_LEVEL_MENU } from "./palette-model";
import { finishPerfAfterPaint } from "@/app/utils/perf/perf-metrics";
import { usePalettePrefetch } from "./use-palette-prefetch";


export default function CommandPalette() {
  const { isOpen, initialQuery, initialMenuId, close, commands, markUsed, createNote, isMorphing } = useCommandPalette();
  const tasks = useAtomValue(atom_visibleTasks);
  const templates = useAtomValue(atom_templates);
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const fontFamily = useAtomValue(atom_editorFontFamily);
  const commandUseCounts = useAtomValue(atom_commandUseCounts);
  const [recentFilePaths, setRecentFilePaths] = useAtom(atom_recentFilePaths);
  const setSearchRegex = useSetAtom(atom_searchRegex);
  // Pinned notes (shared with the sidebar's Files) and pinned commands.
  const { pinnedItems, isPinned, togglePin: togglePinnedRow } = usePalettePins();
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);
  const { openFile, createNoteFromTemplate } = useFileSystem();
  const router = useRouter();
  const pathname = usePathname();
  const isMobileChrome = useIsMobileChrome();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [contextRow, setContextRow] = useState<Row | null>(null);
  // The menu commands (`subcommands`) opened, outermost first, by id.
  const [menuPath, setMenuPath] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  // Registered here only, so it's on every route (useShowFiles).
  const showFilesAction = useShowFiles();
  const filesCommand = useMemo<Command>(() => ({
    id: "show-files",
    label: "Show Files",
    category: "Navigation",
    shortcut: formatShortcut("E", { shift: true }),
    keywords: "files navigator tree browse explorer folders",
    action: showFilesAction,
  }), [showFilesAction]);
  // Search in Files…: the `/` scope (note text), from the palette's menu.
  const searchNotesCommand = useMemo<Command>(() => ({
    id: "search-notes",
    label: "Search in Files…",
    category: "Navigation",
    shortcut: formatShortcut("F", { shift: true }),
    keywords: "search find file note text content full text grep regex",
    closeOnRun: false,
    action: () => { setScope("content"); setQuery(""); inputRef.current?.focus(); },
  }), []);
  const paletteCommands = useMemo(
    () => [filesCommand, searchNotesCommand, ...commands.filter((command) => command.id !== filesCommand.id && command.id !== searchNotesCommand.id)],
    [commands, filesCommand, searchNotesCommand],
  );
  // The open menus, resolved from the current commands so their state
  // (disabled reasons) stays live.
  const menuStack = useMemo(() => {
    const stack: Command[] = [];
    let options = paletteCommands;
    for (const id of menuPath) {
      const menu = options.find((command) => command.id === id);
      if (!menu?.subcommands) break;
      stack.push(menu);
      options = menu.subcommands;
    }
    return stack;
  }, [menuPath, paletteCommands]);
  const menu = menuStack.at(-1) ?? null;

  useEffect(() => {
    if (!isOpen) return;
    const initialScope = scopeFromPrefix(initialQuery);
    setScope(initialScope?.scope ?? null);
    setQuery(initialScope?.query ?? initialQuery);
    setMenuPath(initialMenuId ? [initialMenuId] : []);
    setSelectedIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    finishPerfAfterPaint("palette-open");
  }, [initialMenuId, initialQuery, isOpen]);

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
            // Pages after actions, as in the default list.
            const pageDifference = Number(!!a.command.opens) - Number(!!b.command.opens);
            if (pageDifference) return pageDifference;
            const useCountDifference = (commandUseCounts[b.id] ?? 0) - (commandUseCounts[a.id] ?? 0);
            if (useCountDifference) return useCountDifference;

            const aDefaultIndex = TOP_LEVEL_MENU.indexOf(a.id);
            const bDefaultIndex = TOP_LEVEL_MENU.indexOf(b.id);
            const defaultOrderDifference =
              (aDefaultIndex === -1 ? Number.MAX_SAFE_INTEGER : aDefaultIndex)
              - (bDefaultIndex === -1 ? Number.MAX_SAFE_INTEGER : bDefaultIndex);
            if (defaultOrderDifference) return defaultOrderDifference;
          }

          return b.score - a.score || a.label.localeCompare(b.label);
        });
    }
    if (scope === "tag") return buildTagRows(query, filesByTag);
    if (scope === "task") {
      return buildTaskRows(query, tasks);
    }
    if (scope === "template") return buildTemplateRows(query, templates);
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
  }, [activeEditorView, commandUseCounts, filesByTag, paletteCommands, query, scope, tasks, templates]);

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
    return command ? { ...commandRow(command), detail: command.category ?? "Command" } : null;
  }, [files, paletteCommands]);

  const createRow = useMemo(
    () => (scope || !createNote ? null : buildCreateRow(query, existingFiles)),
    [createNote, existingFiles, query, scope],
  );

  const rows = useMemo(() => {
    if (menu) return buildMenuRows(query, menu).slice(0, MAX_VISIBLE_ROWS);
    if (scope === "content") return contentSearch.rows.slice(0, MAX_VISIBLE_ROWS);
    if (scope) return scopedRows.slice(0, MAX_VISIBLE_ROWS);
    if (query) return createRow ? [...fileRows.slice(0, MAX_VISIBLE_ROWS - 1), createRow] : fileRows;
    const pinned = pinnedItems.map(resolvePinned).filter((row): row is Row => row !== null);
    const pinnedKeys = new Set(pinnedItems.map(pinnedKey));
    const recent = recentFilePaths.slice(0, 5).filter((path) => !pinnedKeys.has(`file:${path}`))
      .map((path) => resolvePinned({ kind: "file", id: path })).filter((row): row is Row => row !== null);
    // The notes first (Enter reopens the last one), then the top-level
    // menu, which always fits.
    const topMenu = TOP_LEVEL_MENU.filter((id) => !pinnedKeys.has(`command:${id}`))
      .map((id) => resolvePinned({ kind: "command", id })).filter((row): row is Row => row !== null);
    return [...[...pinned, ...recent].slice(0, MAX_VISIBLE_ROWS - topMenu.length), ...topMenu];
  }, [contentSearch.rows, createRow, fileRows, menu, pinnedItems, query, recentFilePaths, resolvePinned, scope, scopedRows]);

  useEffect(() => setSelectedIndex(0), [menuPath, query, scope]);
  useEffect(() => setSelectedIndex((index) => Math.min(index, Math.max(0, rows.length - 1))), [rows.length]);
  usePalettePrefetch(isOpen, rows[selectedIndex]);

  // `newNote`: Ctrl/Cmd+Enter, which makes a template row start a new note.
  const execute = async (row: Row | undefined, newNote = false) => {
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
        showErrorToast(error instanceof Error ? error.message : "Failed to create file");
      }
      return;
    }
    if (row.kind === "template") {
      // Into the note in front (no picker in between); Ctrl/Cmd+Enter, or no
      // note open, makes a new note from it.
      close();
      await nextPaint();
      if (!newNote && activeEditorView) {
        document.dispatchEvent(new CustomEvent("hermes:insert-vault-template", { detail: { entry: row.entry } }));
        return;
      }
      const path = await createNoteFromTemplate?.(row.entry);
      if (path && !pathname.startsWith("/editor")) router.push("/editor");
      return;
    }
    if (row.kind === "task") { router.push("/editor/tasks"); close(); return; }
    if (row.kind === "heading") {
      activeEditorView?.dispatch({ selection: { anchor: row.from }, effects: EditorView.scrollIntoView(row.from, { y: "start", yMargin: 16 }) });
      activeEditorView?.focus(); close(); return;
    }
    if (row.command.disabledReason) return;
    markUsed(row.id);
    // A menu opens in place: its list replaces the results.
    if (row.command.subcommands) {
      setMenuPath((path) => [...path.slice(0, menuStack.length), row.id]);
      setScope(null);
      setQuery("");
      inputRef.current?.focus();
      return;
    }
    // Hand-offs (a dialog of their own, a change to the note) run once the
    // palette is gone, so their result shows at once and keeps the focus.
    if (row.command.closeFirst) {
      close();
      await nextPaint();
      try {
        await row.command.action();
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : `Failed to run ${row.label}`);
      }
      return;
    }
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
    togglePinnedRow(row);
    setContextRow(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault(); togglePin(rows[selectedIndex]); return;
    }
    // Alt+R: Regex on or off in the `/` scope (event.code: Option+R types ® on a Mac).
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.code === "KeyR" && scope === "content" && !menu) {
      event.preventDefault(); setSearchRegex((on) => !on); return;
    }
    // Backspace in an empty menu search goes back a level.
    if (event.key === "Backspace" && menu && !query) {
      event.preventDefault(); setMenuPath((path) => path.slice(0, -1)); return;
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
      void execute(rows[selectedIndex], event.ctrlKey || event.metaKey);
    }
  };

  const displayQuery = scope ? `${scopePrefix(scope)}${query}` : query;
  const menuTitle = menuStack.map((command) => command.label.replace(/…$/, "")).join(" › ");
  const scopeMessage = scope === "template" && templates.length === 0 ? "No templates yet. Open Templates to add one or a pack."
    : scope !== "content" ? null
    : contentSearch.status === "unavailable" ? "Text search isn't available in this browser."
      : contentSearch.status === "short" ? "Type at least 2 characters to search file text."
        : contentSearch.invalid ? "Not a valid regular expression yet." : null;
  const contentFootnote = scope !== "content" || contentSearch.status === "unavailable" ? null
    : contentSearch.stalled ? "Search stopped: this pattern takes too long. Try a simpler one."
      : contentSearch.capped ? "Text search covers part of this vault (size limit reached)."
        : contentSearch.pending > 0 ? `Indexing file text… ${contentSearch.pending} file${contentSearch.pending === 1 ? "" : "s"} left`
          : contentSearch.fileScan ? `Searching files… ${contentSearch.fileScan.scanned} of ${contentSearch.fileScan.total}` : null;
  const showsEmptyState = rows.length === 0 && !!(query || scope) && !scopeMessage
    && !(scope === "content" && (contentSearch.status === "searching" || contentSearch.fileScan));

  return <OverlayPanel isOpen={isOpen} onClose={close} variant={isMobileChrome ? "sheet" : "modal"} backdrop="dim"
    // During a search-pill morph the view transition animates; the panel's own
    // enter/exit animations and exit delay would hide it, so they're skipped.
    backdropClassName={`bg-surface/85 dark:bg-black/60 duration-overlay-backdrop motion-reduce:animate-none ${isMorphing ? "" : isOpen ? "animate-in fade-in" : "animate-out fade-out"}`}
    exitDurationMs={isMorphing ? 0 : 200}
    // Centred, at a fixed height so it doesn't jump as the results change.
    containerClassName={isMobileChrome ? "" : "items-center justify-center p-4"}
    panelClassName={isMobileChrome
      ? `flex-1 flex flex-col bg-overlay duration-overlay-panel motion-reduce:animate-none ${isMorphing ? "" : isOpen ? "animate-in fade-in slide-in-from-bottom-2 ease-out" : "animate-out fade-out slide-out-to-bottom-2 ease-in"}`
      : `w-[600px] max-w-full h-[min(520px,calc(100dvh-2rem))] flex flex-col glass-panel glass-panel-soft rounded-xl overflow-hidden duration-overlay-panel motion-reduce:animate-none ${isMorphing ? "" : isOpen ? "animate-in fade-in zoom-in-[0.98] ease-out" : "animate-out fade-out zoom-out-[0.98] ease-in"}`}>
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={handleKeyDown}>
    <PaletteSearchBar
      inputRef={inputRef}
      isOpen={isOpen}
      value={displayQuery}
      placeholder={menu ? `${menuTitle}…` : createNote ? SEARCH_OR_CREATE_PLACEHOLDER : "Search files or type a command..."}
      hasQuery={!!query}
      activeDescendant={rows[selectedIndex] ? `command-palette-option-${selectedIndex}` : undefined}
      onChange={(value) => { if (menu) { setQuery(value); return; } const parsed = scopeFromPrefix(value); setScope(parsed?.scope ?? null); setQuery(parsed?.query ?? value); }}
      onClear={() => { setQuery(""); inputRef.current?.focus(); }}
    >
      {menu && <Button variant="icon" onClick={() => { setMenuPath((path) => path.slice(0, -1)); inputRef.current?.focus(); }} aria-label="Back" title="Back (Backspace)" className="!h-7 !w-7 shrink-0 -order-1 -ml-2 -mr-1"><HiOutlineChevronLeft size={16} /></Button>}
      {isMobileChrome && <Button variant="icon" onClick={close} aria-label="Close" className="shrink-0"><HiOutlineX size={20} /></Button>}
    </PaletteSearchBar>
    <div id="command-palette-results" role="listbox" aria-label="Command palette results" className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto" style={{ fontFamily }}>
      {rows.length === 0 && !query && !scope && (
        <div className="animate-in fade-in slide-in-from-top-1 px-6 py-8 text-center text-ui-footnote text-fg-muted duration-200 motion-reduce:animate-none">
          <p className="font-medium text-fg">Start typing to find a file or action.</p>
        </div>
      )}
      {scopeMessage && <p className="px-6 py-8 text-center text-ui-footnote text-fg-muted">{scopeMessage}</p>}
      {showsEmptyState && (
        <div className="animate-in fade-in slide-in-from-top-1 px-6 py-8 text-center duration-200 motion-reduce:animate-none">
          <span aria-hidden="true" className="text-lg">🪴</span>
          <p className="mt-2 text-ui-footnote text-fg">No matches found</p>
          <p className="mt-1 text-ui-footnote text-fg-muted">Try a file name, or a mode below: #tag, !task, @heading, /text, ~template, &gt;command.</p>
        </div>
      )}
      <div className="py-1.5">{rows.map((row, index) => (
        <React.Fragment key={`${row.kind}:${row.id}`}>
          {/* The default list and an empty `>` list: hairlines between the
              notes, the actions and the pages. */}
          {!query && (!scope || scope === "command") && !menu && index > 0 && rowGroup(row) !== rowGroup(rows[index - 1]) && (
            <div role="presentation" className="mx-5 my-1.5 h-px bg-edge-subtle" />
          )}
          <PaletteRow row={row} index={index} selected={index === selectedIndex} scope={scope} inMenu={!!menu} runningId={runningId} isMobileChrome={isMobileChrome}
            onExecute={(target) => void execute(target)} onHover={setSelectedIndex} onContextMenu={setContextRow} />
        </React.Fragment>
      ))}</div>
      {contentFootnote && <p className="px-5 pb-2 text-ui-footnote text-fg-muted">{contentFootnote}</p>}
    </div>
    <PaletteFooter scope={menu ? null : scope}
      regex={!menu && scope === "content" ? { on: contentSearch.regex, onToggle: () => { setSearchRegex((on) => !on); inputRef.current?.focus(); } } : undefined}
      replace={!menu && scope === "content" && query.trim() ? { onReplace: async () => { close(); await nextPaint(); router.push(editorReplaceHref(query, contentSearch.regex)); } } : undefined}
      onScope={(next) => { setMenuPath([]); setScope((current) => (current === next ? null : next)); setQuery(""); inputRef.current?.focus(); }} />
    {contextRow && <div role="menu" aria-label="Palette item actions" className="absolute right-3 top-28 z-10 animate-in fade-in zoom-in-95 slide-in-from-top-1 rounded-lg glass-panel p-1 duration-150 motion-reduce:animate-none"><Button variant="menu-item" role="menuitem" onClick={() => togglePin(contextRow)}>{isPinned(contextRow) ? "Unpin item" : "Pin item"} <span className="ml-auto text-fg-faint">Ctrl+D</span></Button></div>}
    </div>
  </OverlayPanel>;
}
