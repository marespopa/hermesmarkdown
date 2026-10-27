"use client";

import React, { useState } from "react";
import { useAtomValue } from "jotai";
import { HiOutlineReply } from "react-icons/hi";
import Button from "@/app/components/Button";
import { atom_fileUndoStack, atom_undoneFileGroups } from "@/app/atoms/vault-atoms";
import { changedPaths, trashedCount } from "./turn-journal";

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

// Under a turn that changed files: which ones, and Undo, which puts them all
// back at once through the app's own file Undo (the turn's group on the
// file-undo stack, so ⌘Z in the file tree does the same). Undoing shows at
// once; files edited since the turn are left as they are and listed. Nothing
// shows for a turn that changed nothing, or whose record is gone (after a
// reload, or once later changes pushed it off the stack).
export default function TurnSummary({ turnId, onUndo }: { turnId: string; onUndo: (turnId: string) => Promise<unknown> }) {
  const group = useAtomValue(atom_fileUndoStack).find((g) => g.id === turnId);
  const undone = useAtomValue(atom_undoneFileGroups)[turnId];
  const [undoing, setUndoing] = useState(false);

  if (undone) {
    const notes = [
      undone.skipped.length ? `${undone.skipped.map(baseName).join(", ")} changed since, left as is` : "",
      undone.failed.length ? `${undone.failed.map(baseName).join(", ")} couldn't be restored` : "",
    ].filter(Boolean);
    return (
      <p className="text-ui-caption text-fg-muted">
        Undone{notes.length ? ` · ${notes.join(" · ")}` : ""}
      </p>
    );
  }
  const steps = group?.steps ?? [];
  const paths = changedPaths(steps);
  const trashed = trashedCount(steps);
  if (!paths.length && !trashed) return null;

  const parts = [
    paths.length === 1 ? `Changed ${baseName(paths[0])}` : paths.length ? `Changed ${paths.length} files` : "",
    trashed ? `${trashed} in Trash` : "",
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-fill px-2.5 py-1.5">
      <p className="min-w-0 flex-1 truncate text-ui-caption text-fg-muted" title={paths.join("\n")}>
        {parts.join(" · ")}
      </p>
      <Button
        variant="small"
        className="!h-7 bg-surface hover:bg-fill-hover"
        disabled={undoing}
        onClick={() => {
          setUndoing(true);
          void onUndo(turnId).finally(() => setUndoing(false));
        }}
      >
        <HiOutlineReply size={13} aria-hidden="true" />
        {undoing ? "Undoing…" : "Undo"}
      </Button>
    </div>
  );
}
