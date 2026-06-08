"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import ConflictDialog from "./components/ConflictDialog";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_fileName,
  atom_content,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_workspaceLayout,
  atom_isZenModeActive,
  atom_isSidebarOpen,
  atom_isFileLoading,
} from "@/app/atoms/atoms";
import VaultSidebar from "./components/VaultSidebar";
import WelcomeWizard from "./components/WelcomeWizard";
import VaultSetupWizard from "./components/VaultSetupWizard";
import FrontmatterWizard from "./components/FrontmatterWizard";
import WorkspaceSplitter from "./components/WorkspaceSplitter";
import VaultPendingOverlay from "./components/VaultPendingOverlay";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import StatusBar from "./components/StatusBar";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useFileSync } from "@/app/hooks/use-file-sync";
import { useVaultSync } from "@/app/hooks/use-vault-sync";
import { useAutoSave } from "@/app/hooks/use-auto-save";
import { useDialog } from "@/app/hooks/use-dialog";
import toast from "react-hot-toast";

import {
  HiOutlineChevronRight,
  HiOutlineCog,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineHome,
} from "react-icons/hi";

import { useRouter } from "next/navigation";

export default function LiteEditor() {
  const router = useRouter();
  const [isMounting, setIsMounting] = useState(true);
  const [content, setContent] = useAtom(atom_content);
  const [fileName, setFileName] = useAtom(atom_fileName);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(atom_isSidebarOpen);
  const isFileLoading = useAtomValue(atom_isFileLoading);

  const {
    vaultHandle,
    activeFileHandle,
    isVaultPending,
    isDriveVault,
    restoreVault,
    saveFile,
    exportFile,
    importFile,
    createFile,
    createNewFile,
    syncSidebarToPath,
  } = useFileSystem();

  const dialog = useDialog();
  const hasPromptedForNameRef = useRef(false);

  // Run sync hooks
  const { flush } = useAutoSave(() => {
    if (!activeFileHandle && vaultHandle && !hasPromptedForNameRef.current) {
      hasPromptedForNameRef.current = true;
      handleSave();
    }
  });
  useFileSync();
  useVaultSync();

  // Sync sidebar with active file folder
  const lastSyncedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeFilePath && activeFilePath !== "draft" && activeFilePath !== lastSyncedPathRef.current) {
      lastSyncedPathRef.current = activeFilePath;
      syncSidebarToPath(activeFilePath);
    }
  }, [activeFilePath, syncSidebarToPath]);

  const [isPathSwitching, setIsPathSwitching] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    text: string;
    name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleFocus = () => {
      // Prevent browser from scrolling the body when focusing inputs
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("focusin", handleFocus);
    return () => window.removeEventListener("focusin", handleFocus);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounting(false), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && isMounting) {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setIsSidebarOpen, isMounting]);

  useEffect(() => {
    if (vaultHandle && !isVaultPending && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, [vaultHandle, isVaultPending, setIsSidebarOpen]);

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;
    
    if (activeFileHandle) {
      await saveFile(content);
    } else if (vaultHandle) {
      // Prompt for name if in a vault but no handle yet
      const name = await dialog.prompt("Enter file name:", fileName.replace(".md", ""), "Save to Vault");
      if (name) {
        await createFile(name, content);
      }
    } else {
      await exportFile(content, fileName);
    }
  }, [content, activeFileHandle, vaultHandle, saveFile, exportFile, fileName, dialog, createFile]);

  // Shortcut Listener with Ref Pattern for stability
  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent tablet/mobile browsers from navigating back on ESC.
      if (e.key === "Escape") e.preventDefault();

      // Escape exits Zen Mode
      if (e.key === "Escape" && isZenModeActive) {
        setIsZenModeActive(false);
      }

      // Zen Mode Shortcut
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setIsZenModeActive((prev) => !prev);
      }

      // Manual Save Shortcut (Ctrl+S)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }

      // Flush on Undo (Ctrl+Z)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        flush();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsZenModeActive, flush, isZenModeActive]);

  useLayoutEffect(() => {
    if (!isMounting) {
      setIsPathSwitching(true);
      const timer = setTimeout(() => setIsPathSwitching(false), 500);
      return () => clearTimeout(timer);
    }
  }, [activeFilePath, isMounting]);

  const handleNewFile = () => {
    if (!vaultHandle) {
      resetEditor();
    } else {
      createNewFile();
    }
  };

  const resetEditor = () => {
    setContent("");
    setFileName("untitled");
    setActiveFileHandle(null);
    setActiveFilePath("draft");
    hasPromptedForNameRef.current = false;
    toast.success("New draft started");
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

  return (
    <ErrorBoundary>
      <LoadingOverlay isVisible={isFileLoading} text="Loading file..." />
      <div className={`fixed inset-0 flex bg-paper-light dark:bg-paper-dark text-ink-light dark:text-ink-dark selection:bg-pastel-blue/30 font-sans overflow-hidden overscroll-none transition-all duration-500 ${isVaultPending ? "blur-md pointer-events-none select-none" : ""}`}>
        {/* Modals */}
        <WelcomeWizard />
        <VaultSetupWizard />
        <FrontmatterWizard />
        <ConflictDialog />
        {isVaultPending && <VaultPendingOverlay restoreVault={restoreVault} isDriveVault={isDriveVault} />}
        
        <DialogModal isOpened={pendingFile !== null} onClose={() => setPendingFile(null)} styles="!rounded-[32px] !backdrop-blur-2xl !bg-white/80 dark:!bg-zinc-900/80 !border-none !shadow-2xl">
          <div className="flex flex-col gap-6 text-center py-4 px-2">
            <p className="text-lg font-bold tracking-tight">
              Overwrite draft with <br/><span className="text-blue-500 italic">"{pendingFile?.name}"</span>?
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="primary" className="h-11 px-6 rounded-xl" onClick={() => { if (pendingFile) { setContent(pendingFile.text); setFileName(pendingFile.name); } setPendingFile(null); }}>Overwrite</Button>
              <Button variant="secondary" className="h-11 px-6 rounded-xl" onClick={() => setPendingFile(null)}>Cancel</Button>
            </div>
          </div>
        </DialogModal>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".md,.txt,.markdown" className="hidden" />

        {/* --- MAIN LAYOUT --- */}
        
        {/* Sidebar (Explorer) */}
        <div 
          className={`transition-[width,opacity] duration-1000 [transition-timing-function:cubic-bezier(0.2,1,0.2,1)] flex shrink-0 h-full ${isZenModeActive || !isSidebarOpen ? "w-0 opacity-0 pointer-events-none overflow-hidden" : ""}`}
        >
          <VaultSidebar 
            onOpenSettings={() => router.push("/editor/settings")}
            onNewFile={handleNewFile}
            onImport={handleImport}
            onExport={handleExport}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>

        {/* Workspace Content */}
        <div className="flex-1 flex min-w-0 bg-paper-light dark:bg-paper-dark overflow-hidden relative">
          
          {/* Collapsed Sidebar Toggle Column */}
          {!isSidebarOpen && !isZenModeActive && (
            <div className="w-12 h-full flex flex-col items-center py-6 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-3xl shrink-0 z-40">
               <div className="flex flex-col items-center gap-6">
                 <Button
                    variant="icon"
                    onClick={() => router.push("/")}
                    className="w-10 h-10 opacity-60 hover:opacity-100 text-zinc-600 dark:text-zinc-400"
                    title="Home"
                  >
                    <HiOutlineHome size={24} />
                  </Button>

                 <Button
                    variant="icon"
                    onClick={() => setIsSidebarOpen(true)}
                    className="w-10 h-10 opacity-60 hover:opacity-100 text-zinc-600 dark:text-zinc-400"
                    title="Expand Sidebar"
                  >
                    <HiOutlineChevronRight size={24} />
                  </Button>

                  <Button
                    variant="icon"
                    onClick={() => router.push("/editor/settings")}
                    className="w-10 h-10 opacity-60 hover:opacity-100 text-zinc-600 dark:text-zinc-400"
                    title="Settings"
                  >
                    <HiOutlineCog size={24} />
                  </Button>

                  <Button
                    variant="icon"
                    onClick={() => setIsZenModeActive(!isZenModeActive)}
                    className={`w-10 h-10 transition-colors ${isZenModeActive ? "text-blue-500 opacity-100" : "opacity-60 hover:opacity-100 text-zinc-600 dark:text-zinc-400"}`}
                    title="Toggle Zen Mode (Ctrl+Shift+Z)"
                  >
                    {isZenModeActive ? <HiOutlineEye size={24} /> : <HiOutlineEyeOff size={24} />}
                  </Button>
               </div>
            </div>
          )}

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            <div className="relative flex-1 min-h-0">
              <main className={`h-full transition-all duration-700 ${isPathSwitching ? "opacity-30 blur-[2px]" : "opacity-100"}`}>
                {isMounting ? (
                  <div className="animate-pulse opacity-10 space-y-6 pt-20 px-12 max-w-2xl mx-auto">
                    <div className="h-8 bg-current w-1/3 rounded-lg mb-16" />
                    <div className="h-4 bg-current w-full rounded-md" />
                    <div className="h-4 bg-current w-11/12 rounded-md" />
                    <div className="h-4 bg-current w-5/6 rounded-md" />
                  </div>
                ) : (
                  <WorkspaceSplitter node={workspaceLayout.rootContainer} />
                )}
              </main>
            </div>

            <div className={`${isZenModeActive ? "order-first" : "max-md:order-first"} shrink-0`}>
              <StatusBar />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
