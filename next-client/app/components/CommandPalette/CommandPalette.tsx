"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { EditorView } from "@codemirror/view";
import { HiOutlineSearch, HiOutlineTerminal, HiOutlineX } from "react-icons/hi";
import packageJson from "@/package.json";
import { atom_customWorkspaces, atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_allTasks } from "@/app/atoms/task-atoms";
import {
  atom_activeEditorView,
  atom_commandUseCounts,
  atom_editorFontFamily,
  atom_palettePinnedItems,
  atom_railPanel,
  atom_recentFilePaths,
  atom_selectedFileTags,
  atom_selectedWorkspaceId,
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
  { id: "view", prefix: "%", label: "Views" },
  { id: "heading", prefix: ":", label: "Headings" },
  { id: "explorer", label: "Explorer" },
] as const;

type Scope = (typeof scopes)[number]["id"];
type FileResult = { path: string; name: string; handle: FileSystemFileHandle; tags: string[] };
type Row =
  | { kind: "command"; id: string; label: string; detail: string; command: Command; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "file"; id: string; label: string; detail: string; file: FileResult; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "tag"; id: string; label: string; detail: string; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "task"; id: string; label: string; detail: string; titleIndices: number[]; detailIndices: number[]; score: number }
  | { kind: "view"; id: string; label: string; detail: string; titleIndices: number[]; detailIndices: number[]; score: number }
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

function pinnedKey(item: PalettePinnedItem) {
  return `${item.kind}:${item.id}`;
}

export default function CommandPalette() {
  const { isOpen, initialQuery, close, commands, markUsed } = useCommandPalette();
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const tasks = useAtomValue(atom_allTasks);
  const customWorkspaces = useAtomValue(atom_customWorkspaces);
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const fontFamily = useAtomValue(atom_editorFontFamily);
  const commandUseCounts = useAtomValue(atom_commandUseCounts);
  const [recentFilePaths, setRecentFilePaths] = useAtom(atom_recentFilePaths);
  const [pinnedItems, setPinnedItems] = useAtom(atom_palettePinnedItems);
  const [, setRailPanel] = useAtom(atom_railPanel);
  const [, setSelectedWorkspaceId] = useAtom(atom_selectedWorkspaceId);
  const [, setSelectedFileTags] = useAtom(atom_selectedFileTags);
  const { openFile } = useFileSystem();
  const router = useRouter();
  const pathname = usePathname();
  const isMobileChrome = useIsMobileChrome();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [previewRow, setPreviewRow] = useState<Row | null>(null);
  const [contextRow, setContextRow] = useState<Row | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const scopedRows = useMemo<Row[]>(() => {
    if (!scope) return [];
    if (scope === "explorer") {
      const explorerCommand: Command = {
        id: "open-explorer",
        label: "Open Explorer",
        category: "Navigation",
        keywords: "files navigator sidebar browse",
        action: () => {
          setRailPanel("files");
          if (!pathname.startsWith("/editor")) router.push("/editor");
        },
      };
      const explorerCommandIds = new Set([
        "new-file",
        "new-folder",
        "import-file",
        "open-vault",
        "close-vault",
        "refresh-vault",
        "create-new-vault",
      ]);
      return [explorerCommand, ...commands.filter((command) => explorerCommandIds.has(command.id))]
        .map((command) => {
          const match = matchCommand(query, command);
          return match ? {
            kind: "command" as const, id: command.id, label: command.label,
            detail: command.disabledReason ?? command.category ?? "Explorer", command,
            titleIndices: match.indices, detailIndices: [] as number[], score: match.score,
          } : null;
        }).filter((row): row is Extract<Row, { kind: "command" }> => row !== null)
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    }
    if (scope === "command") {
      return commands.map((command) => {
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
      const counts = new Map<string, number>();
      Object.values(fileMetadata).forEach((metadata) => metadata.tags.forEach((rawTag) => {
        const tag = rawTag.replace(/^#/, "").trim().toLowerCase();
        if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }));
      return Array.from(counts, ([label, count]) => {
        const match = fuzzyMatch(query, label);
        return match ? { kind: "tag" as const, id: label, label: `#${label}`, detail: `${count} ${count === 1 ? "note" : "notes"}`, titleIndices: match.indices.map((index) => index + 1), detailIndices: [] as number[], score: match.score } : null;
      }).filter((row): row is Extract<Row, { kind: "tag" }> => row !== null)
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    }
    if (scope === "task") {
      return tasks.map((task) => {
        const match = fuzzyMatch(query, task.text);
        return match ? { kind: "task" as const, id: task.id, label: task.text || "(empty task)", detail: `${task.path}:${task.line + 1}`, titleIndices: match.indices, detailIndices: [] as number[], score: match.score } : null;
      }).filter((row): row is Extract<Row, { kind: "task" }> => row !== null)
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    }
    if (scope === "view") {
      return [{ id: "today", name: "Today's Work" }, ...customWorkspaces].map((workspace) => {
        const match = fuzzyMatch(query, workspace.name);
        return match ? { kind: "view" as const, id: workspace.id, label: workspace.name, detail: "View", titleIndices: match.indices, detailIndices: [] as number[], score: match.score } : null;
      }).filter((row): row is Extract<Row, { kind: "view" }> => row !== null)
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
  }, [activeEditorView, commands, customWorkspaces, fileMetadata, pathname, query, router, scope, setRailPanel, tasks]);

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
    const command = commands.find((candidate) => candidate.id === item.id);
    return command ? { kind: "command", id: command.id, label: command.label, detail: command.category ?? "Command", command, titleIndices: [], detailIndices: [], score: 0 } : null;
  }, [commands, files]);

  const groups = useMemo(() => {
    if (scope) return [{ label: scopes.find((candidate) => candidate.id === scope)!.label, rows: scopedRows.slice(0, MAX_VISIBLE_ROWS) }];
    if (query) return [{ label: "Files", rows: fileRows }];
    const pinned = pinnedItems.map(resolvePinned).filter((row): row is Row => row !== null);
    const pinnedKeys = new Set(pinnedItems.map(pinnedKey));
    const recent = recentFilePaths.slice(0, 5).filter((path) => !pinnedKeys.has(`file:${path}`))
      .map((path) => resolvePinned({ kind: "file", id: path })).filter((row): row is Row => row !== null);
    const frequent = commands.slice().sort((a, b) => (commandUseCounts[b.id] ?? 0) - (commandUseCounts[a.id] ?? 0) || a.label.localeCompare(b.label))
      .filter((command) => (commandUseCounts[command.id] ?? 0) > 0 && !pinnedKeys.has(`command:${command.id}`)).slice(0, 3)
      .map((command) => resolvePinned({ kind: "command", id: command.id })).filter((row): row is Row => row !== null);
    return [{ label: "Pinned", rows: pinned }, { label: "Recently Opened Files", rows: recent }, { label: "Frequently Used Commands", rows: frequent }].filter((group) => group.rows.length > 0);
  }, [commandUseCounts, commands, fileRows, pinnedItems, query, recentFilePaths, resolvePinned, scope, scopedRows]);
  const rows = groups.flatMap((group) => group.rows);

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
    if (row.kind === "view") { setSelectedWorkspaceId(row.id); setRailPanel("views"); if (!pathname.startsWith("/editor")) router.push("/editor"); close(); return; }
    if (row.kind === "tag") { setSelectedFileTags([row.id]); setRailPanel("search"); if (!pathname.startsWith("/editor")) router.push("/editor"); close(); return; }
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
    if (event.key === "Backspace" && !query && scope) { event.preventDefault(); setScope(null); return; }
    if (event.key === "Tab" && !query) {
      event.preventDefault();
      const index = scope ? scopes.findIndex((candidate) => candidate.id === scope) : -1;
      setScope(scopes[(index + 1) % scopes.length].id);
      return;
    }
    if (event.key === "ArrowDown") { event.preventDefault(); setSelectedIndex((index) => rows.length ? (index + 1) % rows.length : 0); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setSelectedIndex((index) => rows.length ? (index - 1 + rows.length) % rows.length : 0); return; }
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) setPreviewRow(rows[selectedIndex]);
      else void execute(rows[selectedIndex]);
    }
  };

  const isPinned = (row: Row) => (row.kind === "file" || row.kind === "command") && pinnedItems.some((item) => pinnedKey(item) === `${row.kind}:${row.id}`);
  const rowHeight = isMobileChrome ? "min-h-11" : "h-9";

  return <OverlayPanel isOpen={isOpen} onClose={close} variant={isMobileChrome ? "sheet" : "modal"} backdrop="dim" backdropClassName="animate-in fade-in duration-overlay-backdrop motion-reduce:animate-none" exitDurationMs={100}
    containerClassName={isMobileChrome ? "" : "items-start justify-center pt-[18vh] px-4"}
    panelClassName={isMobileChrome
      ? "flex-1 flex flex-col bg-chrome animate-in fade-in slide-in-from-bottom-2 duration-overlay-panel ease-out motion-reduce:animate-none"
      : "w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-18vh-2rem)] flex flex-col bg-chrome border border-edge rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-overlay-panel ease-out motion-reduce:animate-none"}>
    <div className="p-2 border-b border-b-edge" style={{ fontFamily }}>
      <div className="flex items-center justify-between gap-2 px-2 pb-1.5"><span className="text-ui-micro font-medium text-fg">Hermes Markdown</span><span className="text-ui-micro text-fg-faint">v{packageJson.version}</span></div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center min-h-11 sm:min-h-9 px-3 gap-2 rounded-xl border border-edge bg-paper-light dark:bg-paper-dark transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-within:border-sage/50 focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--moss)_12%,transparent)] motion-reduce:transition-none">
          <HiOutlineSearch size={15} className="shrink-0 text-fg-faint" />
          {scope && <Button variant="bare" onClick={() => setScope(null)} aria-label={`Remove ${scopes.find((candidate) => candidate.id === scope)!.label} scope`} className="rounded-md bg-sage/10 px-1.5 py-0.5 text-sage">{scopes.find((candidate) => candidate.id === scope)!.label} ×</Button>}
          <input ref={inputRef} type="search" value={query} onChange={(event) => { const parsed = scopeFromPrefix(event.target.value); if (parsed) { setScope(parsed.scope); setQuery(parsed.query); } else setQuery(event.target.value); }} onKeyDown={handleKeyDown}
            placeholder={scope ? `Search ${scopes.find((candidate) => candidate.id === scope)!.label.toLowerCase()}` : "Search files"} className="flex-1 min-w-0 bg-transparent text-fg text-[15px] outline-none caret-accent [&::-webkit-search-cancel-button]:hidden"
            autoComplete="off" autoCorrect="off" spellCheck={false} role="combobox" aria-label="Search files and command palette modes" aria-expanded={isOpen} aria-controls="command-palette-results" aria-activedescendant={rows[selectedIndex] ? `command-palette-option-${selectedIndex}` : undefined} />
          {query && <Button variant="icon" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear search" className="!w-8 !h-8"><HiOutlineX size={16} /></Button>}
          <Button variant="icon" onClick={() => { setScope(scope === "command" ? null : "command"); inputRef.current?.focus(); }} aria-label={scope === "command" ? "Switch to file search" : "Switch to commands"} aria-pressed={scope === "command"} className="!w-8 !h-8"><HiOutlineTerminal size={16} /></Button>
        </div>
        {isMobileChrome && <Button variant="icon" onClick={close} aria-label="Close" className="shrink-0"><HiOutlineX size={20} /></Button>}
      </div>
      <div className="flex flex-wrap gap-1 px-2 pt-1.5" aria-label="Search scopes">{scopes.map((candidate) => <Button key={candidate.id} variant="bare" onClick={() => setScope(scope === candidate.id ? null : candidate.id)} aria-pressed={scope === candidate.id} className={`rounded-md px-1.5 py-0.5 text-ui-micro transition-[background-color,color,transform] duration-150 ease-out hover:-translate-y-px active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${scope === candidate.id ? "bg-sage/10 text-sage" : "bg-paper-softgray text-fg-muted dark:bg-paper-dark-surface"}`}>{candidate.label}</Button>)}</div>
    </div>
    <div id="command-palette-results" role="listbox" aria-label="Command palette results" className="flex-1 min-h-0 overflow-y-auto" style={{ fontFamily }}>
      {groups.length === 0 && !query && !scope && (
        <div className="animate-in fade-in slide-in-from-top-1 px-6 py-8 text-center text-ui-footnote text-fg-muted duration-200 motion-reduce:animate-none">
          <p className="font-medium text-fg">Search files or choose a scope</p>
          <p className="mt-1">Start typing to find notes, or select a chip to search commands and workspace content.</p>
        </div>
      )}
      {groups.length === 0 && (query || scope) && <div className="flex items-center justify-center h-9 text-ui-footnote text-fg-muted">No results</div>}
      {groups.map((group) => <div key={group.label}><div className="px-4 pt-2 text-ui-micro font-medium text-fg-faint">{group.label}</div>{group.rows.map((row) => {
        const index = rows.indexOf(row); const selected = index === selectedIndex;
        return <Button key={`${row.kind}:${row.id}`} variant="menu-item" id={`command-palette-option-${index}`} role="option" aria-label={`${row.label} ${row.detail}`} aria-selected={selected} aria-disabled={row.kind === "command" && !!row.command.disabledReason}
          isDisabled={runningId !== null || (row.kind === "command" && !!row.command.disabledReason)} onClick={() => void execute(row)} onMouseEnter={() => setSelectedIndex(index)} onContextMenu={(event: React.MouseEvent) => { if (row.kind === "file" || row.kind === "command") { event.preventDefault(); setContextRow(row); } }}
          className={`relative !rounded-none ${rowHeight} justify-between gap-3 pl-10 pr-4 text-left before:absolute before:bottom-1 before:left-0 before:top-1 before:w-0.5 before:scale-y-50 before:bg-accent before:opacity-0 before:transition-[opacity,transform] before:duration-150 hover:translate-x-px motion-reduce:before:transition-none motion-reduce:hover:translate-x-0 ${selected ? "before:scale-y-100 before:opacity-100 bg-accent/10" : ""}`}>
          <span className="truncate"><HighlightedText text={row.label} indices={row.titleIndices} /></span><span className="shrink-0 truncate text-ui-micro text-fg-muted"><HighlightedText text={row.detail} indices={row.detailIndices} /></span>
        </Button>;
      })}</div>)}
    </div>
    {contextRow && <div role="menu" aria-label="Palette item actions" className="absolute right-3 top-28 z-10 animate-in fade-in zoom-in-95 slide-in-from-top-1 rounded-lg border border-edge bg-chrome p-1 shadow-lg duration-150 motion-reduce:animate-none"><Button variant="menu-item" role="menuitem" onClick={() => togglePin(contextRow)}>{isPinned(contextRow) ? "Unpin item" : "Pin item"} <span className="ml-auto text-fg-faint">Ctrl+D</span></Button></div>}
    {previewRow && <div role="dialog" aria-label="Quick preview" className="absolute inset-3 z-20 flex animate-in fade-in zoom-in-95 flex-col rounded-xl border border-edge bg-chrome p-4 shadow-xl duration-200 motion-reduce:animate-none" style={{ fontFamily }}><div className="flex items-center justify-between gap-2"><h2 className="font-semibold text-fg">Quick preview</h2><Button variant="icon" onClick={() => setPreviewRow(null)} aria-label="Close quick preview"><HiOutlineX size={16} /></Button></div><div className="mt-4 min-h-0 overflow-auto"><p className="font-medium text-fg">{previewRow.label}</p><p className="mt-1 text-ui-footnote text-fg-muted">{previewRow.detail}</p><p className="mt-4 text-ui-footnote text-fg-muted">Item details stay available while the palette remains open.</p></div></div>}
  </OverlayPanel>;
}
