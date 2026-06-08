"use client";

import React from "react";
import {
  HiOutlineHome,
  HiOutlineCog,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineLogout,
  HiOutlineDatabase,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";

interface VaultSidebarFooterProps {
  onOpenSettings?: () => void;
  isZenModeActive: boolean;
  setIsZenModeActive: (active: boolean) => void;
  vaultHandle: any;
  closeVault: () => void;
  openVault: () => void;
  isVaultSupported: boolean;
}

export default function VaultSidebarFooter({
  onOpenSettings,
  isZenModeActive,
  setIsZenModeActive,
  vaultHandle,
  closeVault,
  openVault,
  isVaultSupported,
}: VaultSidebarFooterProps) {
  const router = useRouter();

  return (
    <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/40 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="icon"
            onClick={() => router.push("/")}
            className="w-10 h-10 opacity-60 hover:opacity-100"
            title="Go Home"
            aria-label="Go Home"
          >
            <HiOutlineHome size={20} />
          </Button>

          <Button
            variant="icon"
            onClick={onOpenSettings}
            className="w-10 h-10 opacity-60 hover:opacity-100"
            title="Settings"
            aria-label="Settings"
          >
            <HiOutlineCog size={20} />
          </Button>

          <Button
            variant="icon"
            onClick={() => setIsZenModeActive(!isZenModeActive)}
            className={`w-10 h-10 transition-colors ${isZenModeActive ? "text-blue-500 opacity-100" : "opacity-60 hover:opacity-100"}`}
            title="Toggle Zen Mode (Ctrl+Shift+Z)"
            aria-label="Toggle Zen Mode"
          >
            {isZenModeActive ? <HiOutlineEye size={20} /> : <HiOutlineEyeOff size={20} />}
          </Button>
        </div>

        <div className="flex items-center gap-1">
           {vaultHandle ? (
              <Button
                variant="icon"
                onClick={closeVault}
                className="w-10 h-10 text-red-500/60 hover:text-red-500"
                title="Close Vault"
                aria-label="Close Vault"
              >
                <HiOutlineLogout size={20} />
              </Button>
           ) : (
              <Button
                variant="icon"
                onClick={openVault}
                disabled={!isVaultSupported}
                className="w-10 h-10 text-blue-500/60 hover:text-blue-500"
                title={isVaultSupported ? "Open Vault" : "Vault not supported"}
                aria-label={isVaultSupported ? "Open Vault" : "Vault not supported"}
              >
                <HiOutlineDatabase size={20} />
              </Button>
           )}
        </div>
      </div>
    </div>
  );
}
