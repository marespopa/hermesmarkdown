"use client";

import React from "react";
import { HiOutlineLockClosed } from "react-icons/hi";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal";

interface VaultPendingOverlayProps {
  restoreVault: () => void;
  /** Picks a folder to open instead (when the saved one can't be reached). */
  chooseFolder: () => void | Promise<unknown>;
}

// Chrome on Android has no "Allow on every visit" option, so access is asked
// for again on every load there.
const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

export default function VaultPendingOverlay({ restoreVault, chooseFolder }: VaultPendingOverlayProps) {
  const android = isAndroid();
  return (
    <DialogModal
      isOpened={true}
      onClose={() => {}}
      hideCloseButton={true}
      styles="!max-w-[320px] !bg-overlay !border-edge"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <HiOutlineLockClosed size={24} className="text-amber-500" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-ui-body font-semibold tracking-tight">Vault Access Paused</h2>
          <p className="text-ui-footnote text-ink-muted dark:text-stone leading-relaxed">
            Your browser needs permission again to open your local folder. If it
            can&apos;t be reached (moved or deleted), choose it again.
            {!android && (
              <>
                {" "}Choose <span className="font-semibold">Allow on every visit</span> so
                this doesn&apos;t come back.
              </>
            )}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={restoreVault}
          className="w-full h-11 rounded-xl mt-1"
        >
          Restore Access
        </Button>
        {/* The gate treats any click or key as "restore access"; this one is not. */}
        <Button
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            void chooseFolder();
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className="w-full h-11 rounded-xl -mt-2"
        >
          Choose Folder…
        </Button>
        <p className="text-ui-footnote text-ink-muted dark:text-stone -mt-2">
          {android ? "or tap anywhere to restore" : "or press any key to restore"}
        </p>
      </div>
    </DialogModal>
  );
}
