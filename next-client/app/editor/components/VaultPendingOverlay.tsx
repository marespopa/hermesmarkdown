"use client";

import React from "react";
import { HiOutlineLockClosed } from "react-icons/hi";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal";

interface VaultPendingOverlayProps {
  restoreVault: () => void;
  isDriveVault?: boolean;
}

export default function VaultPendingOverlay({ restoreVault, isDriveVault }: VaultPendingOverlayProps) {
  return (
    <DialogModal
      isOpened={true}
      onClose={() => {}}
      hideCloseButton={true}
      styles="!max-w-[320px] !bg-white/80 dark:!bg-zinc-900/80 !backdrop-blur-2xl !border-zinc-200/50 dark:!border-zinc-800/50"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <HiOutlineLockClosed size={24} className="text-amber-500" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-ui-body font-semibold tracking-tight">Vault Access Paused</h2>
          <p className="text-ui-footnote text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {isDriveVault
              ? "Your Google Drive session has expired. Re-authenticate to continue."
              : "Browser security requires re-authorization to access your local files."}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={restoreVault}
          className="w-full h-11 rounded-xl mt-1"
        >
          Restore Access
        </Button>
      </div>
    </DialogModal>
  );
}
