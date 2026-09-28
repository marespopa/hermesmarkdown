"use client";

import React from "react";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import type { PendingDraft } from "../hooks/use-draft-import";

interface DraftImportDialogProps {
  pendingDraft: PendingDraft | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// Asks before an imported file replaces a draft that already has text.
export default function DraftImportDialog({ pendingDraft, onConfirm, onCancel }: DraftImportDialogProps) {
  return (
    <DialogModal isOpened={pendingDraft !== null} onClose={onCancel} styles="!rounded-[32px] !backdrop-blur-2xl !bg-paper-light/80 dark:!bg-paper-dark/80">
      <div className="flex flex-col gap-6 text-center py-4 px-2">
        <p className="text-lg font-bold tracking-tight">
          Overwrite draft with <br/><span className="text-sage italic">&quot;{pendingDraft?.name}&quot;</span>?
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="primary" className="h-11 px-6 rounded-xl" onClick={onConfirm}>Overwrite</Button>
          <Button variant="secondary" className="h-11 px-6 rounded-xl" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </DialogModal>
  );
}
