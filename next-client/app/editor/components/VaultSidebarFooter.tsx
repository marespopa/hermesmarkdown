"use client";

import React from "react";
import {
  HiOutlineLogout,
  HiOutlineDatabase,
  HiOutlineRefresh,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineHome,
  HiOutlineBookOpen,
} from "react-icons/hi";
import Button from "@/app/components/Button";

interface VaultSidebarFooterProps {
  vaultHandle: any;
  closeVault: () => void;
  openVault: () => void;
  isVaultSupported: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showHiddenFiles?: boolean;
  onToggleHiddenFiles?: () => void;
  onHome?: () => void;
  onOpenDocumentation?: () => void;
}

// Mirrors IconRail's RailButton tooltip, anchored above instead of to the
// side since this is a horizontal row at the bottom of the sidebar.
function FooterTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-overlay border border-edge text-fg text-ui-caption px-2 py-1 opacity-0 group-hover/footer-item:opacity-100 transition-opacity [transition-delay:400ms] z-50">
      {label}
    </span>
  );
}

export default function VaultSidebarFooter({
  vaultHandle,
  closeVault,
  openVault,
  isVaultSupported,
  onRefresh,
  isRefreshing,
  showHiddenFiles,
  onToggleHiddenFiles,
  onHome,
  onOpenDocumentation,
}: VaultSidebarFooterProps) {
  return (
    <div className="p-4 border-t border-edge-subtle bg-transparent shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
           {onHome && (
              <div className="relative group/footer-item">
                <Button
                  variant="icon"
                  onClick={onHome}
                  className="w-10 h-10 opacity-80 hover:opacity-100"
                  aria-label="Home"
                >
                  <HiOutlineHome size={18} />
                </Button>
                <FooterTooltip label="Home" />
              </div>
           )}

           {onOpenDocumentation && (
              <div className="relative group/footer-item">
                <Button
                  variant="icon"
                  onClick={onOpenDocumentation}
                  className="w-10 h-10 opacity-80 hover:opacity-100"
                  aria-label="Documentation"
                >
                  <HiOutlineBookOpen size={18} />
                </Button>
                <FooterTooltip label="Documentation" />
              </div>
           )}
        </div>

        <div className="flex items-center gap-1">
           {vaultHandle && onToggleHiddenFiles && (
              <div className="relative group/footer-item">
                <Button
                  variant="icon"
                  onClick={onToggleHiddenFiles}
                  className="w-10 h-10 opacity-80 hover:opacity-100"
                  aria-label="Show hidden files"
                  aria-pressed={showHiddenFiles}
                >
                  {showHiddenFiles ? <HiOutlineEye size={18} /> : <HiOutlineEyeOff size={18} />}
                </Button>
                <FooterTooltip label="Show hidden files" />
              </div>
           )}

           {vaultHandle && onRefresh && (
              <div className="relative group/footer-item">
                <Button
                  variant="icon"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="w-10 h-10 opacity-80 hover:opacity-100"
                  aria-label="Refresh vault"
                >
                  <HiOutlineRefresh size={18} className={isRefreshing ? "animate-spin" : ""} />
                </Button>
                <FooterTooltip label="Refresh vault" />
              </div>
           )}

           {vaultHandle ? (
              <div className="relative group/footer-item">
                <Button
                  variant="icon"
                  onClick={closeVault}
                  className="w-10 h-10 text-red-500/80 hover:text-red-500"
                  aria-label="Close Vault"
                >
                  <HiOutlineLogout size={20} />
                </Button>
                <FooterTooltip label="Close Vault" />
              </div>
           ) : (
              <div className="relative group/footer-item">
                <Button
                  variant="icon"
                  onClick={openVault}
                  disabled={!isVaultSupported}
                  className="w-10 h-10 text-sage/80 hover:text-sage"
                  aria-label={isVaultSupported ? "Open Vault" : "Vault not supported"}
                >
                  <HiOutlineDatabase size={20} />
                </Button>
                <FooterTooltip label={isVaultSupported ? "Open Vault" : "Vault not supported"} />
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
