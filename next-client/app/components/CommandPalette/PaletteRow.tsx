"use client";

import Button from "@/app/components/Button";
import SensitiveBadge from "@/app/components/SensitiveBadge";
import React from "react";
import { HiOutlineRefresh } from "react-icons/hi";
import { HighlightedText, parentFolder, type Row, type Scope } from "./palette-model";

interface PaletteRowProps {
  row: Row;
  index: number;
  selected: boolean;
  scope: Scope | null;
  runningId: string | null;
  isMobileChrome: boolean;
  onExecute: (row: Row) => void;
  onHover: (index: number) => void;
  onContextMenu: (row: Row) => void;
}

// Extra text after a row's label: why a command is disabled, a task's
// location, or the tags a #tag result matched.
function resultContext(row: Row, scope: Scope | null) {
  if (row.kind === "command") return row.command.disabledReason;
  if (row.kind === "task") return row.detail;
  if (row.kind === "file" && scope === "tag") return row.detail;
  return null;
}

// One option in the palette's result list. Content (`/`) rows take two
// lines: the highlighted snippet, then `name:line` with the folder.
export default function PaletteRow({ row, index, selected, scope, runningId, isMobileChrome, onExecute, onHover, onContextMenu }: PaletteRowProps) {
  const context = resultContext(row, scope);
  const folder = row.kind === "file" || row.kind === "content" ? parentFolder(row.file.path) : "";
  const isMaskedTask = row.kind === "task" && row.isMasked;
  const isSensitive = isMaskedTask || (row.kind === "file" && row.file.isSensitive);
  const accessibleLabel = [
    isMaskedTask ? "Sensitive task" : row.label,
    isSensitive && !isMaskedTask ? "(sensitive)" : null,
    context,
    row.kind === "content" ? row.detail : null,
    folder,
  ].filter(Boolean).join(" ");
  const rowHeight = isMobileChrome ? "min-h-11" : "min-h-10";
  const stateClass = selected
    ? "border-edge bg-chrome text-fg shadow-sm hover:bg-chrome dark:bg-surface dark:hover:bg-surface"
    : "border-transparent hover:bg-surface-raised";

  return <Button variant="menu-item" id={`command-palette-option-${index}`} role="option" aria-label={accessibleLabel} aria-selected={selected} aria-disabled={row.kind === "command" && !!row.command.disabledReason} aria-busy={runningId === row.id}
    isDisabled={runningId !== null || (row.kind === "command" && !!row.command.disabledReason)} onClick={() => onExecute(row)} onMouseEnter={() => onHover(index)} onContextMenu={(event: React.MouseEvent) => { if (row.kind === "file" || row.kind === "command") { event.preventDefault(); onContextMenu(row); } }}
    className={`mx-2 w-[calc(100%_-_1rem)] !rounded-md ${rowHeight} ${row.kind === "content" ? "flex-col !items-stretch !gap-0.5 !py-1.5" : "justify-between gap-3"} border px-3 text-left font-normal ${stateClass}`}>
    {row.kind === "content" ? <>
      <span className="min-w-0 truncate"><HighlightedText text={row.label} indices={row.titleIndices} /></span>
      <span className="flex min-w-0 gap-3 text-ui-footnote text-fg-muted">
        <span className="min-w-0 flex-1 truncate">{row.detail}</span>
        {folder && <span title={folder} className="max-w-[45%] shrink-0 truncate text-right">{folder}</span>}
      </span>
    </> : <>
      <span className="min-w-0 flex-1 truncate"><HighlightedText text={row.label} indices={row.titleIndices} />{isSensitive && <SensitiveBadge className="ml-1.5 align-[-2px]" />}{context && <span className="ml-2 text-ui-footnote text-fg-muted"><HighlightedText text={context} indices={row.detailIndices} /></span>}</span>
      {folder && <span title={folder} className="max-w-[45%] shrink-0 truncate text-right text-ui-footnote text-fg-muted"><HighlightedText text={folder} indices={scope === "tag" ? [] : row.detailIndices} /></span>}
      {runningId === row.id
        ? <HiOutlineRefresh aria-label="Running" size={14} className="shrink-0 animate-spin text-fg-muted motion-reduce:animate-none" />
        : row.kind === "command" && row.command.shortcut && <span className="shrink-0 font-mono text-ui-micro text-fg-muted">{row.command.shortcut}</span>}
    </>}
  </Button>;
}
