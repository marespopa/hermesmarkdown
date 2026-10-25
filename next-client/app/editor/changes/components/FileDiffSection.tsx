"use client";

import { memo, useMemo, useState } from "react";
import { HiOutlineChevronDown, HiOutlineChevronRight } from "react-icons/hi";
import Button from "@/app/components/Button";
import { formatCount } from "@/app/components/CountBadge";
import type { ChangedFile, FileDiff } from "@/app/services/git/git-changes-types";
import { layoutDiff } from "../diff-layout";
import DiffLines from "./DiffLines";

interface Props {
  file: ChangedFile;
  collapsed: boolean;
  /** The chevron: the file's path and whether it should now be collapsed. */
  onCollapse: (path: string, collapsed: boolean) => void;
  /** Opens a file at a line; undefined when this one can't be opened. */
  onOpen?: (path: string, line: number) => void;
  /** The line **Open file** opens: the file's first change. */
  pathLine: number;
  id: string;
}

const NO_GAPS: ReadonlySet<number> = new Set();
const STATUS_WORD = { added: "Added", modified: "Modified", deleted: "Deleted" } as const;

export function Counts({ file }: { file: ChangedFile }) {
  if (file.added === null || file.removed === null) return <span className="text-fg-faint">—</span>;
  return (
    <span className="whitespace-nowrap font-medium">
      <span className="text-task-done">+{formatCount(file.added)}</span> <span className="text-danger">−{formatCount(file.removed)}</span>
    </span>
  );
}

const MESSAGES: Record<Exclude<FileDiff["kind"], "text">, string> = {
  binary: "Binary file",
  "too-large": "File too large to show",
  error: "Couldn't read this file",
  skipped: "Diff not loaded — too many changes",
};

// One file of the Changes page: a sticky header (collapse chevron, path,
// status, +/−, Open file) and its unified diff, or a message when it has
// none. Reading the diff never leaves the page: only Open file does.
// Memoized: with stable callbacks, a rescan re-renders only the sections
// whose file changed (the page reuses unchanged files' objects).
export default memo(function FileDiffSection({ file, collapsed, onCollapse, onOpen, pathLine, id }: Props) {
  // Expanded gaps stay open until the next scan gives this file a new diff.
  const [gaps, setGaps] = useState<{ diff: FileDiff; ids: Set<number> }>({ diff: file.diff, ids: new Set() });
  const expanded = gaps.diff === file.diff ? gaps.ids : NO_GAPS;
  const rows = useMemo(
    () => (!collapsed && file.diff.kind === "text" ? layoutDiff(file.diff, expanded) : []),
    [collapsed, file.diff, expanded],
  );
  const toggleLabel = `${collapsed ? "Expand" : "Collapse"} ${file.path}`;

  return (
    <section id={id} className="overflow-clip rounded-xl border border-edge-subtle bg-surface [contain-intrinsic-size:auto_200px] [content-visibility:auto]">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-edge-subtle bg-surface px-2 py-1.5">
        <Button variant="icon-small" aria-expanded={!collapsed} aria-label={toggleLabel} onClick={() => onCollapse(file.path, !collapsed)}>
          {collapsed ? <HiOutlineChevronRight size={14} aria-hidden /> : <HiOutlineChevronDown size={14} aria-hidden />}
        </Button>
        <span className="min-w-0 flex-1 break-all text-ui-footnote font-medium">{file.path}</span>
        <span className="shrink-0 text-ui-caption text-fg-muted">{STATUS_WORD[file.status]}</span>
        <span className="shrink-0 text-ui-caption">
          <Counts file={file} />
        </span>
        {onOpen && (
          <Button variant="small" onClick={() => onOpen(file.path, pathLine)} aria-label={`Open ${file.path}`} className="shrink-0">
            Open file
          </Button>
        )}
      </header>
      {!collapsed &&
        (file.diff.kind !== "text" ? (
          <p className="px-4 py-3 text-ui-footnote text-fg-muted">{MESSAGES[file.diff.kind]}</p>
        ) : file.diff.changes.length === 0 ? (
          <p className="px-4 py-3 text-ui-footnote text-fg-muted">Empty file</p>
        ) : (
          <DiffLines
            rows={rows}
            onExpandGap={(gap) => setGaps({ diff: file.diff, ids: new Set([...expanded, gap]) })}
          />
        ))}
    </section>
  );
});
