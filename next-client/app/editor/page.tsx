"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import SettingsDialog from "./components/SettingsDialog";
import ConflictDialog from "./components/ConflictDialog";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_fileName,
  atom_content,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_workspaceLayout,
  atom_isZenModeActive,
} from "@/app/atoms/atoms";
import VaultSidebar from "./components/VaultSidebar";
import WelcomeWizard from "./components/WelcomeWizard";
import WorkspaceSplitter from "./components/WorkspaceSplitter";
import StatusBar from "./components/StatusBar";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useFileSync } from "@/app/hooks/use-file-sync";
import { useVaultSync } from "@/app/hooks/use-vault-sync";
import { useAutoSave } from "@/app/hooks/use-auto-save";
import { useDialog } from "@/app/hooks/use-dialog";
import toast from "react-hot-toast";

import {
  HiOutlineMenuAlt2,
} from "react-icons/hi";

export default function LiteEditor() {
  const [isMounting, setIsMounting] = useState(true);
  const [content, setContent] = useAtom(atom_content);
  const [fileName, setFileName] = useAtom(atom_fileName);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const [isZenModeActive, setIsZenModeActive] = useAtom(atom_isZenModeActive);

  const {
    vaultHandle,
    activeFileHandle,
    saveFile,
    exportFile,
    importFile,
    createFile,
  } = useFileSystem();

  const dialog = useDialog();
  const hasPromptedForNameRef = useRef(false);

  // Run sync hooks
  useAutoSave(() => {
    if (!activeFileHandle && vaultHandle && !hasPromptedForNameRef.current) {
      hasPromptedForNameRef.current = true;
      handleSave();
    }
  });
  useFileSync();
  useVaultSync();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPathSwitching, setIsPathSwitching] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    text: string;
    name: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounting(false), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Default sidebar to closed on mobile or if no vault is loaded to avoid "pushing" content
    if (typeof window !== "undefined") {
      if (window.innerWidth < 1024 || !vaultHandle) {
        setIsSidebarOpen(false);
      }
    }
  }, [vaultHandle]);

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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsZenModeActive]);

  useEffect(() => {
    if (!isMounting) {
      setIsPathSwitching(true);
      const timer = setTimeout(() => setIsPathSwitching(false), 500);
      return () => clearTimeout(timer);
    }
  }, [activeFilePath, isMounting]);

  const handleNewFile = () => {
    resetEditor();
  };

  const resetEditor = () => {
    setContent("");
    setFileName("untitled.md");
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
      <div className="flex h-[100dvh] w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/30 font-mono overflow-hidden overscroll-none">
        {/* Modals */}
        <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        <WelcomeWizard />
        <ConflictDialog />
        
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

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".md,.txt,.markdown" className="hidden" />

        {/* --- MAIN LAYOUT --- */}
        
        {/* Sidebar (Explorer) */}
        <div 
          className={`transition-[width,opacity] duration-700 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] flex shrink-0 h-full border-r border-zinc-200 dark:border-zinc-800 ${isZenModeActive || !isSidebarOpen ? "w-0 opacity-0 pointer-events-none overflow-hidden border-none" : ""}`}
        >
          <VaultSidebar 
            onOpenSettings={() => setIsSettingsOpen(true)}
            onNewFile={handleNewFile}
            onImport={handleImport}
            onExport={handleExport}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>

        {/* Workspace Content */}
        <div className="flex-1 flex min-w-0 bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative">
          
          {/* Collapsed Sidebar Toggle Column */}
          {!isSidebarOpen && !isZenModeActive && (
            <div className="w-10 h-full flex flex-col items-center py-4 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 shrink-0 z-40">
               <Button
                  variant="icon"
                  onClick={() => setIsSidebarOpen(true)}
                  className="w-8 h-8 opacity-60 hover:opacity-100 text-zinc-600 dark:text-zinc-400"
                  title="Show Sidebar"
                >
                  <HiOutlineMenuAlt2 size={20} />
                </Button>
            </div>
          )}

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 relative">
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

            <StatusBar />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
