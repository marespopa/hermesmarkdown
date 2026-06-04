"use client";

import React from "react";
import {
  HiOutlineDocumentText,
  HiOutlineDatabase,
  HiOutlineCloudDownload,
  HiOutlineCloudUpload,
} from "react-icons/hi";
import SidebarHeader from "./SidebarHeader";

interface VaultSidebarEmptyProps {
  isVaultSupported: boolean;
  openVault: () => void;
  onImport?: () => void;
  onExport?: () => void;
  setActiveFilePath: (path: string) => void;
  activeFilePath: string | null;
  onClose?: () => void;
}

export default function VaultSidebarEmpty({
  isVaultSupported,
  openVault,
  onImport,
  onExport,
  setActiveFilePath,
  activeFilePath,
  onClose,
}: VaultSidebarEmptyProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <SidebarHeader title="Locations" isExpanded={true} onToggle={() => {}} />
        
        {isVaultSupported ? (
          <div 
            onClick={openVault}
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 transition-colors text-ui-footnote text-zinc-600 dark:text-zinc-400 font-medium"
          >
            <HiOutlineDatabase size={18} />
            <span>Open Folder</span>
          </div>
        ) : (
          <div className="px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-2">
            <p className="text-ui-footnote text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
              Vaults require Desktop.
            </p>
          </div>
        )}

        <div 
          onClick={() => {
             setActiveFilePath("draft");
             if (onClose && window.innerWidth < 1024) onClose();
          }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-ui-footnote relative ${activeFilePath === 'draft' ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10" : "hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 font-medium"}`}
        >
          <HiOutlineDocumentText size={18} />
          <span>Draft Mode</span>
        </div>
      </div>

      <div className="space-y-1">
        <SidebarHeader title="Actions" isExpanded={true} onToggle={() => {}} />
        <div 
          onClick={onImport}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 transition-colors text-ui-footnote text-zinc-600 dark:text-zinc-400 font-medium"
        >
          <HiOutlineCloudDownload size={18} />
          <span>Import Markdown</span>
        </div>
        <div 
          onClick={onExport}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 transition-colors text-ui-footnote text-zinc-600 dark:text-zinc-400 font-medium"
        >
          <HiOutlineCloudUpload size={18} />
          <span>Export Markdown</span>
        </div>
      </div>
    </div>
  );
}
