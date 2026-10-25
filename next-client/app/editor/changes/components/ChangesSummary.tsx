"use client";

import type { ReactNode } from "react";
import Button from "@/app/components/Button";
import { formatCount } from "@/app/components/CountBadge";
import type { ChangedFile } from "@/app/services/git/git-changes-types";
import { Counts } from "./FileDiffSection";

interface Props {
  files: ChangedFile[];
  commit: string | null;
  /** Whether the scan is done (ScanStatus), after the commit. */
  status?: ReactNode;
  onJump: (path: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}

const STATUS = {
  added: { letter: "A", label: "Added", color: "text-task-done" },
  modified: { letter: "M", label: "Modified", color: "text-fg-muted" },
  deleted: { letter: "D", label: "Deleted", color: "text-danger" },
} as const;

// The top of the Changes page: how many files changed with the line totals,
// whether the scan is still checking, then a row per file that jumps to its section.
export default function ChangesSummary({ files, commit, status, onJump, onCollapseAll, onExpandAll }: Props) {
  const added = files.reduce((total, file) => total + (file.added ?? 0), 0);
  const removed = files.reduce((total, file) => total + (file.removed ?? 0), 0);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-ui-headline font-semibold">{formatCount(files.length, ["file changed", "files changed"])}</h2>
        <span className="text-ui-footnote font-medium text-task-done">+{formatCount(added)}</span>
        <span className="text-ui-footnote font-medium text-danger">−{formatCount(removed)}</span>
        {commit && <span className="text-ui-caption text-fg-faint [font-family:var(--font-code)]">{commit.slice(0, 7)}</span>}
        {status}
        <span className="flex-1" />
        <Button variant="small" onClick={onCollapseAll}>Collapse All</Button>
        <Button variant="small" onClick={onExpandAll}>Expand All</Button>
      </div>
      <ul aria-label="Changed files" className="max-h-60 divide-y divide-edge-subtle overflow-y-auto rounded-xl border border-edge-subtle bg-surface custom-scrollbar">
        {files.map((file) => (
          <li key={file.path}>
            <Button variant="unstyled" onClick={() => onJump(file.path)} className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-ui-footnote hover:bg-fill">
              <span className={`w-4 shrink-0 text-center font-semibold ${STATUS[file.status].color}`} title={STATUS[file.status].label}>
                {STATUS[file.status].letter}
              </span>
              <span className="min-w-0 flex-1 break-all">{file.path}</span>
              <Counts file={file} />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
