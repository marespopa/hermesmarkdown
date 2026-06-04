"use client";

import React from "react";
import { useFileSystem } from "@/app/hooks/use-file-system";
import Button from "@/app/components/Button";
import { HiOutlineExclamationCircle } from "react-icons/hi";

export default function VaultPendingBanner() {
  const { isVaultPending, restoreVault } = useFileSystem();

  if (!isVaultPending) return null;

  return (
    <div className="bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-xl border-b border-amber-200/50 dark:border-amber-800/50 px-4 py-2 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-500 z-30 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <HiOutlineExclamationCircle className="text-amber-500 shrink-0" size={20} />
        <p className="text-[11px] font-bold tracking-tight text-amber-900/70 dark:text-amber-200/70 truncate">
          Vault Access Paused — Re-authorize to sync changes
        </p>
      </div>
      <Button 
        variant="primary" 
        onClick={restoreVault} 
        className="h-8 px-4 text-[11px] rounded-xl shrink-0"
      >
        Restore Access
      </Button>
    </div>
  );
}
