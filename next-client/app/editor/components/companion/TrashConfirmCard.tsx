"use client";

import React from "react";
import { useAtomValue, useStore } from "jotai";
import { HiOutlineTrash } from "react-icons/hi";
import Button from "@/app/components/Button";
import { answerTrash, atom_trashRequests } from "./trash-confirm";

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);

// In place of a trash call's chip while it waits: what the companion wants
// to move to the Trash, and the user's answer. Keep is the safe default (it
// takes focus); Move to Trash lets the call go on. Nothing shows once
// answered (the chip then says how it went).
export default function TrashConfirmCard({ toolCallId }: { toolCallId: string }) {
  const store = useStore();
  const paths = useAtomValue(atom_trashRequests)[toolCallId];
  if (!paths) return null;

  const what = paths.length === 1 ? `“${baseName(paths[0])}”` : `${paths.length} items`;
  return (
    <div role="group" aria-label="Move to Trash?" className="flex flex-col gap-2 rounded-lg bg-fill px-3 py-2.5">
      <div className="flex items-start gap-2">
        <HiOutlineTrash size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-fg-muted" />
        <div className="min-w-0">
          <p className="text-ui-footnote font-medium text-fg">Move {what} to Trash?</p>
          <p className="truncate text-ui-caption text-fg-muted" title={paths.join("\n")}>
            {paths.length === 1 ? paths[0] : paths.map(baseName).join(", ")} · kept 30 days
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" autoFocus onClick={() => answerTrash(store, toolCallId, false)}>Keep</Button>
        <Button variant="warning" onClick={() => answerTrash(store, toolCallId, true)}>Move to Trash</Button>
      </div>
    </div>
  );
}
