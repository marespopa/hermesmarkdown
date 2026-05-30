"use client";

import React from "react";
import {
  HiOutlineHome,
  HiOutlineMenuAlt2,
  HiOutlineDocumentAdd,
  HiOutlineFolderOpen,
  HiOutlineSave,
  HiOutlineSaveAs,
  HiOutlineCog,
  HiOutlineDatabase,
  HiOutlineLogout,
} from "react-icons/hi";
import { useRouter } from "next/navigation";

interface LeftRibbonProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  onNewFile: () => void;
  onImport: () => void;
  onExport: () => void;
  onOpenSettings: () => void;
  vaultHandle: any;
  isVaultPending: boolean;
  onRestoreVault: () => void;
  onCloseVault: () => void;
  onOpenVault: () => void;
  isVaultSupported: boolean;
}

export default function LeftRibbon({
  isSidebarOpen,
  toggleSidebar,
  onNewFile,
  onImport,
  onExport,
  onOpenSettings,
  vaultHandle,
  isVaultPending,
  onRestoreVault,
  onCloseVault,
  onOpenVault,
  isVaultSupported,
}: LeftRibbonProps) {
  const router = useRouter();

  const menuItemClass = (active?: boolean) => `
    w-full flex flex-col items-center justify-center gap-1.5 py-3 transition-all duration-200 group relative
    ${active ? "text-blue-500 bg-blue-500/5" : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50"}
  `;

  const labelClass = "text-[8px] font-bold tracking-[0.15em] whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity";

  return (
    <aside className="hidden md:grid grid-rows-[auto_1fr_auto] w-20 h-full bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 z-50 overflow-hidden shrink-0 transition-all duration-300">
      {/* Top Section */}
      <div className="border-b border-neutral-200/50 dark:border-neutral-800/50">
        <button
          onClick={() => router.push("/")}
          className={menuItemClass()}
          title="Go Home"
        >
          <HiOutlineHome size={22} />
          <span className={labelClass}>Home</span>
        </button>
      </div>

      {/* Scrollable Middle Section */}
      <div className="flex flex-col overflow-y-auto no-scrollbar min-h-0">
        {/* Toggle Sidebar */}
        {vaultHandle && (
          <>
            <button
              onClick={toggleSidebar}
              className={menuItemClass(isSidebarOpen)}
              title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              <HiOutlineMenuAlt2 size={22} />
              <span className={labelClass}>{isSidebarOpen ? "Close" : "Open"}</span>
              {isSidebarOpen && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-500 rounded-l-full" />}
            </button>

            <div className="h-px w-8 bg-neutral-200 dark:bg-neutral-800 my-2 mx-auto shrink-0" />
          </>
        )}

        {/* Vault Controls */}
        {!vaultHandle ? (
          <button
            onClick={onOpenVault}
            disabled={!isVaultSupported}
            className={menuItemClass()}
            title={isVaultSupported ? "Open Vault" : "Vault not supported"}
          >
            <HiOutlineDatabase size={22} />
            <span className={labelClass}>Vault</span>
          </button>
        ) : isVaultPending ? (
          <button
            onClick={onRestoreVault}
            className={`${menuItemClass()} text-blue-500 animate-pulse`}
            title="Restore Vault Access"
          >
            <HiOutlineDatabase size={22} />
            <span className={labelClass}>Restore</span>
          </button>
        ) : (
          <button
            onClick={onCloseVault}
            className={`${menuItemClass()} text-red-500 hover:bg-red-500/5`}
            title="Close Vault"
          >
            <HiOutlineLogout size={22} />
            <span className={labelClass}>Exit</span>
          </button>
        )}

        {/* New File */}
        <button
          onClick={onNewFile}
          className={menuItemClass()}
          title={vaultHandle ? "New Note" : "New Draft"}
        >
          <HiOutlineDocumentAdd size={22} />
          <span className={labelClass}>New</span>
        </button>

        {/* Import */}
        {!vaultHandle && (
           <button
            onClick={onImport}
            className={menuItemClass()}
            title="Import File"
          >
            <HiOutlineFolderOpen size={22} />
            <span className={labelClass}>Import</span>
          </button>
        )}

        {/* Save/Export */}
        <button
          onClick={onExport}
          className={menuItemClass()}
          title={vaultHandle ? "Save" : "Export"}
        >
          {vaultHandle ? <HiOutlineSave size={22} /> : <HiOutlineSaveAs size={22} />}
          <span className={labelClass}>{vaultHandle ? "Save" : "Export"}</span>
        </button>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onOpenSettings}
          className={menuItemClass()}
          title="Settings"
        >
          <HiOutlineCog size={22} />
          <span className={labelClass}>Settings</span>
        </button>
      </div>
    </aside>
  );
}
