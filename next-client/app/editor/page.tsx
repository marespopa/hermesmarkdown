"use client";

import React, { useState, useEffect, useRef } from "react";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import SettingsDialog from "./components/SettingsDialog";
import ConflictDialog from "./components/ConflictDialog";
import UnsavedChangesDialog from "./components/UnsavedChangesDialog";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import {
  atom_fileName,
  atom_content,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_showStats,
  atom_saveStatus,
  atom_workspaceLayout,
  atom_openFiles,
  atom_lastSavedContent,
} from "@/app/atoms/atoms";
import VaultSidebar from "./components/VaultSidebar";
import LeftRibbon from "./components/LeftRibbon";
import WorkspaceSplitter from "./components/WorkspaceSplitter";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useFileSync } from "@/app/hooks/use-file-sync";
import { useVaultSync } from "@/app/hooks/use-vault-sync";
import toast from "react-hot-toast";

import {
  HiOutlineFolderOpen,
  HiOutlineCog,
  HiOutlineDocumentAdd,
  HiOutlineDatabase,
  HiOutlineMenuAlt2,
  HiOutlineHome,
  HiOutlineSave,
  HiOutlineSaveAs,
} from "react-icons/hi";

export default function LiteEditor() {
  const [content, setContent] = useAtom(atom_content);
  const [fileName, setFileName] = useAtom(atom_fileName);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const [showStats] = useAtom(atom_showStats);
  const [saveStatus] = useAtom(atom_saveStatus);
  const [workspaceLayout] = useAtom(atom_workspaceLayout);
  const [openFiles, setOpenFiles] = useAtom(atom_openFiles);
  const [lastSavedContent] = useAtom(atom_lastSavedContent);

  const {
    openVault,
    closeVault,
    vaultHandle,
    activeFileHandle,
    saveFile,
    exportFile,
    importFile,
    createNewFile,
    isVaultPending,
    restoreVault,
    isVaultSupported,
  } = useFileSystem();

  useFileSync();
  useVaultSync();

  const [isMounting, setIsMounting] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPathSwitching, setIsPathSwitching] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    text: string;
    name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setIsMounting(false), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounting) {
      setIsPathSwitching(true);
      const timer = setTimeout(() => setIsPathSwitching(false), 200);
      return () => clearTimeout(timer);
    }
  }, [activeFilePath, isMounting]);

  useEffect(() => {
    if (content && Object.keys(openFiles).length === 0) {
      setOpenFiles({
        draft: {
          content,
          lastSavedContent,
          fileName: fileName || "untitled",
          activeFilePath: activeFilePath,
        }
      });
    }
  }, [content, fileName, activeFilePath, lastSavedContent, setOpenFiles, openFiles]);

  const handleNewFile = () => {
    if (vaultHandle) {
      createNewFile();
      return;
    }
    
    // Draft mode logic
    if (content.trim()) {
      setIsNewConfirmOpen(true);
    } else {
      resetEditor();
    }
  };

  const resetEditor = () => {
    setContent("");
    setFileName("");
    setActiveFileHandle(null);
    setActiveFilePath("draft");
    setIsNewConfirmOpen(false);
    toast.success("New draft started");
  };

  const handleOpenVault = async () => {
    await openVault();
    setIsSidebarOpen(true);
  };

  const handleExport = async () => {
    if (!content.trim()) return;

    if (activeFileHandle) {
      const success = await saveFile(content);
      if (success) return;
    }
    await exportFile(content, fileName);
  };

  const handleImport = async () => {
    const result = await importFile();
    if (result === null) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const nameOnly = file.name.replace(/\.[^/.]+$/, "");

      if (!content.trim()) {
        setContent(text);
        setFileName(nameOnly);
      } else {
        setPendingFile({ text, name: nameOnly });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <ErrorBoundary>
      <div className="flex h-[100dvh] w-full bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 selection:bg-blue-500/30 font-mono overflow-hidden overscroll-none">
        {/* Modals */}
        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        <ConflictDialog />
        <UnsavedChangesDialog />
        
        <DialogModal isOpened={pendingFile !== null} onClose={() => setPendingFile(null)}>
          <div className="flex flex-col gap-6 text-center py-2">
            <p className="text-sm font-medium tracking-tight">
              Overwrite current draft with <span className="italic text-blue-500">"{pendingFile?.name}"</span>?
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="primary" onClick={() => { if (pendingFile) { setContent(pendingFile.text); setFileName(pendingFile.name); } setPendingFile(null); }}>Overwrite</Button>
              <Button variant="secondary" onClick={() => setPendingFile(null)}>Cancel</Button>
            </div>
          </div>
        </DialogModal>

        <DialogModal isOpened={isNewConfirmOpen} onClose={() => setIsNewConfirmOpen(false)}>
          <div className="flex flex-col gap-6 text-center py-2">
            <p className="text-sm font-medium tracking-tight">Start a <span className="text-red-500">new file</span>? Unsaved changes will be lost.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="primary" onClick={resetEditor}>Confirm New</Button>
              <Button variant="secondary" onClick={() => setIsNewConfirmOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogModal>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".md,.txt,.markdown" className="hidden" />

        {/* --- MAIN LAYOUT --- */}
        
        {/* Leftmost Ribbon */}
        <LeftRibbon 
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => {
            setIsSidebarOpen(!isSidebarOpen);
          }}
          onNewFile={handleNewFile}
          onImport={handleImport}
          onExport={handleExport}
          onOpenSettings={() => setIsSettingsOpen(true)}
          vaultHandle={vaultHandle}
          isVaultPending={isVaultPending}
          onRestoreVault={restoreVault}
          onCloseVault={closeVault}
          onOpenVault={handleOpenVault}
          isVaultSupported={isVaultSupported}
        />

        {/* Sidebar (Explorer) */}
        {isSidebarOpen && vaultHandle && (
          <div className="hidden md:block h-full border-r border-neutral-200 dark:border-neutral-800 shrink-0">
            <VaultSidebar />
          </div>
        )}

        {/* Workspace Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900 overflow-hidden relative">
          
          {/* Mobile Header (When sidebar closed) */}
          {!isSidebarOpen && (
            <div className="md:hidden flex items-center h-11 px-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0 bg-neutral-50/50 dark:bg-neutral-950/50 backdrop-blur-md justify-between">
               <div className="flex items-center">
                  <Button
                    variant="icon"
                    onClick={() => setIsSidebarOpen(true)}
                    className="!rounded-xl"
                  >
                    <HiOutlineMenuAlt2 size={20} />
                  </Button>
                  <div className="ml-4 flex flex-col">
                    <span className="text-[10px] font-bold tracking-widest text-blue-500">HermesMD</span>
                    <span className="text-[8px] font-mono opacity-40">Editor</span>
                  </div>
               </div>

               <Button 
                variant="icon" 
                onClick={handleExport} 
                className="!rounded-xl text-blue-500"
                title={vaultHandle ? "Save" : "Export"}
               >
                  {vaultHandle ? <HiOutlineSave size={20} /> : <HiOutlineSaveAs size={20} />}
               </Button>
            </div>
          )}

          <main className={`flex-1 min-h-0 relative transition-all duration-300 ${isPathSwitching ? "opacity-30" : "opacity-100"}`}>
            {isMounting ? (
              <div className="animate-pulse opacity-10 space-y-4 pt-12 px-12">
                <div className="h-4 bg-current w-1/4 mb-10" />
                <div className="h-4 bg-current w-full" />
                <div className="h-4 bg-current w-5/6" />
              </div>
            ) : (
              <WorkspaceSplitter node={workspaceLayout.rootContainer} />
            )}
          </main>

          {/* Status Bar / Stats */}
          {showStats && (
            <footer className="h-8 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between px-4 shrink-0 pointer-events-auto">
              <div className="flex items-center gap-4 text-[9px] font-mono tracking-widest opacity-40">
                <span><span className="text-blue-500 font-bold">{wordCount}</span> W</span>
                <span><span className="text-blue-500 font-bold">{content.length}</span> C</span>
              </div>
              
              <div className="flex items-center gap-4 text-[9px] font-mono tracking-widest opacity-40 truncate">
                {saveStatus.state === "saving" ? (
                  <span className="text-blue-500 animate-pulse">Saving...</span>
                ) : saveStatus.state === "saved" ? (
                  <span className="text-green-500">Saved</span>
                ) : (
                  <span>{fileName || "draft"}.md</span>
                )}
              </div>
            </footer>
          )}
        </div>

        {/* Mobile Sidebar Navigation */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm" onClick={() => { setIsSidebarOpen(false); }}>
            <div className="absolute top-0 left-0 bottom-0 w-72 bg-white dark:bg-neutral-900 shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex-1 overflow-y-auto">
                {vaultHandle ? (
                  <VaultSidebar onClose={() => setIsSidebarOpen(false)} />
                ) : (
                  <div className="p-6 flex flex-col gap-3">
                      <h2 className="text-[10px] tracking-[0.2em] font-bold opacity-30 mb-4">Navigation</h2>
                      <Button variant="menu-item" onClick={handleOpenVault} className="justify-start gap-3"><HiOutlineDatabase size={18} className="text-blue-500" /> Open Vault</Button>
                      <Button variant="menu-item" onClick={handleNewFile} className="justify-start gap-3"><HiOutlineDocumentAdd size={18} /> New Draft</Button>
                      <Button variant="menu-item" onClick={handleExport} className="justify-start gap-3"><HiOutlineSaveAs size={18} /> Export</Button>
                      <Button variant="menu-item" onClick={handleImport} className="justify-start gap-3"><HiOutlineFolderOpen size={18} /> Import</Button>
                      <Button variant="menu-item" onClick={() => {setIsSettingsOpen(true); setIsSidebarOpen(false);}} className="justify-start gap-3"><HiOutlineCog size={18} className="text-blue-500" /> Settings</Button>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
                 <Button variant="menu-item" onClick={() => router.push("/")} className="justify-start gap-3 w-full opacity-60"><HiOutlineHome size={18} /> Go Home</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
