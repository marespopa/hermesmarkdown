"use client";

import React from "react";
import {
  HiOutlineLogout,
  HiOutlineDatabase,
  HiOutlineRefresh,
} from "react-icons/hi";
import Button from "@/app/components/Button";

interface VaultSidebarFooterProps {
  vaultHandle: any;
  closeVault: () => void;
  openVault: () => void;
  isVaultSupported: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function VaultSidebarFooter({
  vaultHandle,
  closeVault,
  openVault,
  isVaultSupported,
  onRefresh,
  isRefreshing,
}: VaultSidebarFooterProps) {
  return (
    <div className="p-4 border-t border-edge-subtle bg-transparent shrink-0">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1">
           {vaultHandle && onRefresh && (
              <Button
                variant="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="w-10 h-10 opacity-80 hover:opacity-100"
                title="Refresh vault"
                aria-label="Refresh vault"
              >
                <HiOutlineRefresh size={18} className={isRefreshing ? "animate-spin" : ""} />
              </Button>
           )}

           {vaultHandle ? (
              <Button
                variant="icon"
                onClick={closeVault}
                className="w-10 h-10 text-red-500/80 hover:text-red-500"
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
                className="w-10 h-10 text-sage/80 hover:text-sage"
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
