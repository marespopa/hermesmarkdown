"use client";

import React from "react";
import Button from "@/app/components/Button";
import {
  HiOutlineDocumentText,
  HiOutlineDatabase,
  HiOutlineCloudDownload,
  HiOutlineCloudUpload,
  HiOutlineFolderAdd,
} from "react-icons/hi";
import SectionHeader from "./SectionHeader";

interface VaultEmptyStateProps {
  isVaultSupported: boolean;
  openVault: () => void;
  onCreateVault?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onConnectGitHub?: () => void;
  setActiveFilePath: (path: string) => void;
  activeFilePath: string | null;
  onClose?: () => void;
}

export default function VaultEmptyState({
  isVaultSupported,
  openVault,
  onCreateVault,
  onImport,
  onExport,
  onConnectGitHub,
  setActiveFilePath,
  activeFilePath,
  onClose,
}: VaultEmptyStateProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <SectionHeader title="Locations" isExpanded={true} onToggle={() => {}} />

        <Button
          variant="menu-item"
          onClick={onConnectGitHub}
          aria-label="Connect GitHub Vault"
          className="px-4 py-3"
        >
          <HiOutlineCloudUpload size={18} />
          <span>Connect GitHub Vault</span>
        </Button>

        {isVaultSupported ? (
          <>
            <div
              onClick={onCreateVault}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 transition-colors text-ui-footnote text-ink-muted dark:text-stone font-medium"
            >
              <HiOutlineFolderAdd size={18} />
              <span>Create New Vault</span>
            </div>
            <div
              onClick={openVault}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 transition-colors text-ui-footnote text-ink-muted dark:text-stone font-medium"
            >
              <HiOutlineDatabase size={18} />
              <span>Open Vault</span>
            </div>
          </>
        ) : (
          <div className="px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-2">
            <p className="text-ui-footnote text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
              Local vaults require Desktop.
            </p>
          </div>
        )}

        <div
          onClick={() => {
             setActiveFilePath("draft");
             if (onClose && window.innerWidth < 1024) onClose();
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-ui-footnote relative ${activeFilePath === 'draft' ? "text-sage dark:text-sage font-bold bg-sage/10" : "hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 text-ink-muted dark:text-stone font-medium"}`}
        >
          <HiOutlineDocumentText size={18} />
          <span>Draft Mode</span>
        </div>
      </div>

      <div className="space-y-1">
        <SectionHeader title="Actions" isExpanded={true} onToggle={() => {}} />
        <div
          onClick={onImport}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 transition-colors text-ui-footnote text-ink-muted dark:text-stone font-medium"
        >
          <HiOutlineCloudDownload size={18} />
          <span>Import Markdown</span>
        </div>
        <div
          onClick={onExport}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/40 transition-colors text-ui-footnote text-ink-muted dark:text-stone font-medium"
        >
          <HiOutlineCloudUpload size={18} />
          <span>Export Markdown</span>
        </div>
      </div>
    </div>
  );
}
