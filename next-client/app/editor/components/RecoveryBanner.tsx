"use client";

import React, { useState } from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { HiOutlineExclamation } from "react-icons/hi";
import { FiX } from "react-icons/fi";
import { atom_activeFilePath, atom_content, atom_vaultName } from "@/app/atoms/atoms";
import { atom_recoveryIssue, LARGE_NOTE_CHARS, type RecoveryIssue } from "@/app/atoms/recovery-atoms";
import Button from "@/app/components/Button";
import { useRecoveryActions } from "../hooks/use-recovery-actions";

// Only flips when the note crosses the limit, so typing doesn't re-render.
const atom_isActiveNoteLarge = atom((get) => get(atom_content).length > LARGE_NOTE_CHARS);

type Action = { label: string; onClick: () => void };

function percent(issue: Extract<RecoveryIssue, { kind: "storage-low" }>): number {
  return Math.round((issue.usage / issue.quota) * 100);
}

// One line above the editor while something keeps notes from being saved:
// the vault folder's access was taken back or the folder went away, or
// browser storage is (nearly) full. Each says the open notes are still in
// memory and offers to export the note in front as .md. With nothing wrong,
// a note over LARGE_NOTE_CHARS gets a quiet, dismissible word that typing
// may lag. Otherwise nothing shows.
export default function RecoveryBanner() {
  const issue = useAtomValue(atom_recoveryIssue);
  const setIssue = useSetAtom(atom_recoveryIssue);
  const vaultName = useAtomValue(atom_vaultName) ?? "the vault";
  const isLarge = useAtomValue(atom_isActiveNoteLarge);
  const activePath = useAtomValue(atom_activeFilePath) ?? "draft";
  const [dismissedLarge, setDismissedLarge] = useState<string[]>([]);
  const { exportNote, regrantAccess, chooseVault, freeUpSpace } = useRecoveryActions();

  const exportAction: Action = { label: "Export file as .md", onClick: exportNote };
  const clearCache: Action = { label: "Clear cache", onClick: () => void freeUpSpace() };

  let message: string;
  let actions: Action[];
  let tone = "text-task-hold";
  let onDismiss: (() => void) | undefined;

  if (issue?.kind === "access-lost") {
    message = `Hermes lost access to ${vaultName}. Your edits are held in memory.`;
    actions = [{ label: "Grant access again", onClick: () => void regrantAccess() }, exportAction];
  } else if (issue?.kind === "vault-missing") {
    message = `${vaultName} was moved or deleted. Your open files are held in memory.`;
    actions = [exportAction, { label: "Choose folder", onClick: () => void chooseVault() }];
    tone = "text-danger";
  } else if (issue?.kind === "storage-full") {
    message = "Browser storage is full: changes may not survive a reload.";
    actions = [exportAction, clearCache];
    tone = "text-danger";
  } else if (issue?.kind === "storage-low") {
    message = `Browser storage is ${percent(issue)}% full.`;
    actions = [exportAction, clearCache];
    onDismiss = () => setIssue(null);
  } else if (isLarge && !dismissedLarge.includes(activePath)) {
    message = "This file is very large, so typing may lag.";
    actions = [];
    tone = "text-fg-faint";
    onDismiss = () => setDismissedLarge((paths) => [...paths, activePath]);
  } else {
    return null;
  }

  return (
    <div className="fixed top-12 right-[var(--content-right,0px)] left-[var(--content-left,0px)] z-30 flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 max-w-xl rounded-xl border border-edge bg-surface-raised px-3 py-2 shadow-sm font-sans text-ui-footnote text-fg"
      >
        <HiOutlineExclamation size={16} className={`shrink-0 ${tone}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">{message}</span>
        {actions.map((action) => (
          <Button key={action.label} variant="bare" className="text-fg" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
        {onDismiss && (
          <Button variant="close" aria-label="Dismiss" className="!w-6 !h-6 -mr-1" onClick={onDismiss}>
            <FiX size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
