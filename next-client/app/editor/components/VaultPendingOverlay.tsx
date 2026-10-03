"use client";

import React from "react";
import { HiOutlineLockClosed } from "react-icons/hi";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal";

interface VaultPendingOverlayProps {
  restoreVault: () => void;
  // Access was granted and the vault is loading.
  isUnlocking?: boolean;
}

// Chrome on Android has no "Allow on every visit" option, so access is asked
// for again on every load there.
const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

export default function VaultPendingOverlay({ restoreVault, isUnlocking = false }: VaultPendingOverlayProps) {
  const android = isAndroid();
  return (
    <DialogModal
      isOpened={true}
      onClose={() => {}}
      hideCloseButton={true}
      styles="!max-w-[320px] !bg-paper-light/80 dark:!bg-paper-dark/80 !backdrop-blur-2xl !border-beige/50 dark:!border-clay/50"
    >
      <div className="flex flex-col items-center gap-4 text-center" aria-busy={isUnlocking}>
        {isUnlocking ? (
          <>
            <div className="w-12 h-12 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-edge border-t-sage animate-spin" />
            </div>
            <h2 className="text-ui-body font-semibold tracking-tight">Restoring vault…</h2>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <HiOutlineLockClosed size={24} className="text-amber-500" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-ui-body font-semibold tracking-tight">Vault Access Paused</h2>
              <p className="text-ui-footnote text-ink-muted dark:text-stone leading-relaxed">
                Your browser needs permission again to open your local folder.
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
            <p className="text-ui-footnote text-ink-muted dark:text-stone -mt-2">
              {android ? "or tap anywhere" : "or press any key"}
            </p>
          </>
        )}
      </div>
    </DialogModal>
  );
}
