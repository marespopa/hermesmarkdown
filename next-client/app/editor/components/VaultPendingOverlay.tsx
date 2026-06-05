"use client";

import React from "react";
import { HiOutlineLockClosed } from "react-icons/hi";
import Button from "@/app/components/Button";

interface VaultPendingOverlayProps {
  restoreVault: () => void;
}

export default function VaultPendingOverlay({ restoreVault }: VaultPendingOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-[28px] p-8 flex flex-col items-center gap-4 max-w-xs w-full text-center mx-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <HiOutlineLockClosed size={24} className="text-amber-500" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-ui-body font-semibold tracking-tight">Vault Access Paused</h2>
          <p className="text-ui-footnote text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Browser security requires re-authorization to access your local files.
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
    </div>
  );
}
