"use client";

import Button from "@/app/components/Button";
import PrivateBadge from "@/app/components/PrivateBadge";
import React from "react";
import type { IconType } from "react-icons";
import {
  HiOutlineArrowSmRight, HiOutlineBookOpen, HiOutlineCheckCircle, HiOutlineChevronRight, HiOutlineExternalLink, HiOutlineCog, HiOutlineDocumentAdd, HiOutlineDocumentText, HiOutlineEye,
  HiOutlineHashtag, HiOutlineLightningBolt, HiOutlinePlus, HiOutlineRefresh, HiOutlineSearch, HiOutlineSparkles, HiOutlineTemplate,
} from "react-icons/hi";
import { HighlightedText, parentFolder, type Row, type Scope, SEARCH_KBD_CLASS } from "./palette-model";

interface PaletteRowProps {
  row: Row;
  index: number;
  selected: boolean;
  scope: Scope | null;
  /** In a menu (a command's `subcommands`): command rows show their description. */
  inMenu?: boolean;
  runningId: string | null;
  isMobileChrome: boolean;
  onExecute: (row: Row) => void;
  onHover: (index: number) => void;
  onContextMenu: (row: Row) => void;
}

// Extra text after a row's label: why a command is disabled (or, in a
// menu, what it does), a task's location, or the tags a #tag result matched.
function resultContext(row: Row, scope: Scope | null, inMenu: boolean) {
  if (row.kind === "command") return row.command.disabledReason ?? (inMenu ? row.command.description : undefined);
  if (row.kind === "task") return row.detail;
  if (row.kind === "file" && scope === "tag") return row.detail;
  return null;
}

// A row's leading glyph, neutral grey: notes and headings by kind; the
// top-level menu's commands by id; other commands by category.
const COMMAND_ICONS: Record<string, IconType> = {
  "search-notes": HiOutlineSearch,
  "new-file": HiOutlineDocumentAdd,
  "insert-template": HiOutlineTemplate,
  "open-templates": HiOutlineTemplate,
  "go-templates": HiOutlineTemplate,
  "open-tasks-panel": HiOutlineCheckCircle,
  "go-tasks": HiOutlineCheckCircle,
  "toggle-focus-mode": HiOutlineEye,
  "open-settings": HiOutlineCog,
  "open-documentation": HiOutlineBookOpen,
};
function rowIcon(row: Row): IconType {
  if (row.kind === "file") return HiOutlineDocumentText;
  if (row.kind === "create") return HiOutlinePlus;
  if (row.kind === "template") return HiOutlineTemplate;
  if (row.kind === "heading") return HiOutlineHashtag;
  if (row.kind === "task") return HiOutlineCheckCircle;
  if (row.kind !== "command") return HiOutlineLightningBolt;
  return COMMAND_ICONS[row.id]
    ?? (row.command.category === "AI" ? HiOutlineSparkles : row.command.category === "Settings" ? HiOutlineCog : row.command.category === "Help" ? HiOutlineBookOpen : HiOutlineLightningBolt);
}

// One option in the palette's result list. Content (`/`) rows take two
// lines: the highlighted snippet, then `name:line` with the folder.
export default function PaletteRow({ row, index, selected, scope, inMenu = false, runningId, isMobileChrome, onExecute, onHover, onContextMenu }: PaletteRowProps) {
  const context = resultContext(row, scope, inMenu);
  // Right-aligned: a note's folder, or a template's pack.
  const folder = row.kind === "file" || row.kind === "content" ? parentFolder(row.file.path) : row.kind === "template" ? row.detail : "";
  const isMaskedTask = row.kind === "task" && row.isMasked;
  const isPrivate = isMaskedTask || (row.kind === "file" && row.file.isPrivate);
  const opens = row.kind === "command" ? row.command.opens : undefined;
  const accessibleLabel = [
    isMaskedTask ? "Private task" : row.label,
    isPrivate && !isMaskedTask ? "(private)" : null,
    context,
    row.kind === "content" ? row.detail : null,
    folder,
    opens === "tab" ? "(opens in a new tab)" : null,
  ].filter(Boolean).join(" ");
  const rowHeight = isMobileChrome ? "min-h-11" : "min-h-10";
  const stateClass = selected
    // Translucent fills, so the palette's glass shows through its rows.
    // The theme's accent, as the sidebar's current row and the file tree's.
    ? "border-transparent bg-accent/15 text-fg hover:bg-accent/15"
    : "border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06]";
  const Icon = rowIcon(row);

  return <Button variant="menu-item" id={`command-palette-option-${index}`} role="option" aria-label={accessibleLabel} aria-selected={selected} aria-disabled={row.kind === "command" && !!row.command.disabledReason} aria-busy={runningId === row.id}
    isDisabled={runningId !== null || (row.kind === "command" && !!row.command.disabledReason)} onClick={() => onExecute(row)} onMouseEnter={() => onHover(index)} onContextMenu={(event: React.MouseEvent) => { if (row.kind === "file" || row.kind === "command") { event.preventDefault(); onContextMenu(row); } }}
    className={`mx-2 w-[calc(100%_-_1rem)] !rounded-lg ${rowHeight} ${row.kind === "content" ? "flex-col !items-stretch !gap-0.5 !py-1.5" : "justify-between gap-3"} border px-3 text-left font-normal ${stateClass}`}>
    {row.kind === "content" ? <>
      <span className="min-w-0 truncate"><HighlightedText text={row.label} indices={row.titleIndices} /></span>
      <span className="flex min-w-0 gap-3 text-ui-footnote text-fg-muted">
        <span className="min-w-0 flex-1 truncate">{row.detail}</span>
        {folder && <span title={folder} className="max-w-[45%] shrink-0 truncate text-right">{folder}</span>}
      </span>
    </> : <>
      <Icon aria-hidden="true" size={16} className={`shrink-0 ${selected ? "text-fg" : "text-fg-muted"}`} />
      <span className="-ml-0.5 min-w-0 flex-1 truncate"><HighlightedText text={row.label} indices={row.titleIndices} />{isPrivate && <PrivateBadge className="ml-1.5 align-[-2px]" />}{context && <span className="ml-2 text-ui-footnote text-fg-muted"><HighlightedText text={context} indices={row.detailIndices} /></span>}</span>
      {folder && <span title={folder} className="max-w-[45%] shrink-0 truncate text-right text-ui-footnote text-fg-muted"><HighlightedText text={folder} indices={scope === "tag" ? [] : row.detailIndices} /></span>}
      {runningId === row.id
        ? <HiOutlineRefresh aria-label="Running" size={14} className="shrink-0 animate-spin text-fg-muted motion-reduce:animate-none" />
        : row.kind === "command" && row.command.shortcut && <kbd className={SEARCH_KBD_CLASS}>{row.command.shortcut}</kbd>}
      {row.kind === "command" && row.command.subcommands && <HiOutlineChevronRight aria-hidden="true" size={14} className="-ml-1.5 shrink-0 text-fg-muted" />}
      {/* Leaves the note: an arrow for another page, the external mark for a new tab. */}
      {opens === "page" && <HiOutlineArrowSmRight aria-hidden="true" size={15} className="-ml-1.5 shrink-0 text-fg-faint" />}
      {opens === "tab" && <HiOutlineExternalLink aria-hidden="true" size={14} className="-ml-1.5 shrink-0 text-fg-faint" />}
    </>}
  </Button>;
}
