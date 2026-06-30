"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import ConflictDialog from "./components/ConflictDialog";
import { useAtom, useAtomValue } from "jotai";
import {
  atom_fileName,
  atom_content,
  atom_lastSavedContent,
  atom_activeFileHandle,
  atom_activeFilePath,
  atom_workspaceLayout,
  atom_isFileLoading,
  atom_sidebarWidth,
} from "@/app/atoms/atoms";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import VaultSidebar from "./components/VaultSidebar";
import IconRail from "./components/IconRail";
import WelcomeWizard from "./components/WelcomeWizard";
import VaultSetupWizard from "./components/VaultSetupWizard";
import FrontmatterWizard from "./components/FrontmatterWizard";
import SchemaWizard from "./components/SchemaWizard";
import VaultMigrateWizard from "./components/VaultMigrateWizard";
import NewVaultDialog from "./components/NewVaultDialog";
import WorkspaceSplitter from "./components/WorkspaceSplitter";
import VaultPendingOverlay from "./components/VaultPendingOverlay";
import DriveReconnectBanner from "./components/DriveReconnectBanner";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import DocInfoPanel from "./components/DocInfoPanel";
import EditorCommands from "./components/EditorCommands";
import { CommandPaletteProvider } from "@/app/components/CommandPalette/CommandPaletteContext";
import CommandPalette from "@/app/components/CommandPalette/CommandPalette";
import MobileBottomNav from "./components/MobileBottomNav";
import MobileFileOverlay from "./components/MobileFileOverlay";
import MobileSearchOverlay from "./components/MobileSearchOverlay";
import MobileFileIndicator from "./components/MobileFileIndicator";
import MobileSelectionToolbar from "./components/MobileSelectionToolbar";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useFileWatcher } from "@/app/hooks/use-file-watcher";
import { useVaultSync } from "@/app/hooks/use-vault-sync";
import { useAutoSave } from "@/app/hooks/use-auto-save";
import { useDialog } from "@/app/hooks/use-dialog";
import toast from "react-hot-toast";


import { useRouter } from "next/navigation";
import { atom_isAiConfigured, atom_isDocInfoOpen, atom_aiBuilderRequest, atom_railPanel, RailPanel } from "@/app/atoms/ui-atoms";
import { generateFileFromPrompt } from "@/app/services/ai";
import { withRetry } from "@/app/hooks/file-system/shared";

export default function LiteEditor() {
  const router = useRouter();
  const [isMounting, setIsMounting] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [content, setContent] = useAtom(atom_content);
  const lastSavedContent = useAtomValue(atom_lastSavedContent);
  const [fileName, setFileName] = useAtom(atom_fileName);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const [railPanel, setRailPanel] = useAtom(atom_railPanel);
  const sidebarWidth = useAtomValue(atom_sidebarWidth);
  // Kept mounted while collapsing/expanding so the wrapper's width transition
  // (below) can animate smoothly instead of the panel popping in/out on unmount.
  const [lastPanel, setLastPanel] = useState<RailPanel>(railPanel ?? "files");
  useEffect(() => {
    if (railPanel !== null) setLastPanel(railPanel);
  }, [railPanel]);
  const isFileLoading = useAtomValue(atom_isFileLoading);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const [, setIsDocInfoOpen] = useAtom(atom_isDocInfoOpen);
  const [, setAiBuilderRequest] = useAtom(atom_aiBuilderRequest);
  const isMobileChrome = useIsMobileChrome();
  const [isMobileFileOverlayOpen, setIsMobileFileOverlayOpen] = useState(false);
  const [isMobileSearchOverlayOpen, setIsMobileSearchOverlayOpen] = useState(false);

  const {
    vaultHandle,
    vaultFiles,
    activeFileHandle,
    isVaultPending,
    isDriveVault,
    driveAuthState,
    driveSignIn,
    restoreVault,
    saveFile,
    exportFile,
    importFile,
    createFile,
    createNewFile,
    scanVault,
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
  const { refresh: refreshFiles } = useFileWatcher();
  const { syncVault } = useVaultSync();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Sync sidebar with active file folder
  const lastSyncedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeFilePath && activeFilePath !== "draft" && activeFilePath !== lastSyncedPathRef.current) {
      lastSyncedPathRef.current = activeFilePath;
      syncSidebarToPath(activeFilePath);
    }
  }, [activeFilePath, syncSidebarToPath]);

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

  const navigateWithGuard = useCallback(async (path: string) => {
    const isDirty = content !== lastSavedContent && content.trim() !== "";
    if (!isDirty) {
      setIsNavigating(true);
      router.push(path);
      return;
    }
    const choice = await dialog.select(
      "You have unsaved changes.",
      [
        { label: "Save & Leave", value: "save" },
        { label: "Discard Changes", value: "discard" },
      ],
      "Unsaved Changes"
    );
    if (choice === "save") {
      await handleSaveRef.current();
      setIsNavigating(true);
      router.push(path);
    } else if (choice === "discard") {
      setIsNavigating(true);
      router.push(path);
    }
  }, [content, lastSavedContent, router, dialog]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent tablet/mobile browsers from navigating back on ESC.
      if (e.key === "Escape") e.preventDefault();

      // Escape collapses the sidebar (rail itself always stays visible)
      if (e.key === "Escape" && railPanel !== null) {
        setRailPanel(null);
      }

      // Expand/collapse sidebar
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setRailPanel((prev) => (prev !== null ? null : "files"));
      }

      // Document info — word/token count, structured score (on-demand, not ambient)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setIsDocInfoOpen((prev) => !prev);
      }

      // AI Builder — on-demand, not a status bar button
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        if (isAiConfigured) {
          e.preventDefault();
          setAiBuilderRequest((v) => v + 1);
        }
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
  }, [flush, railPanel, setRailPanel, setIsDocInfoOpen, isAiConfigured, setAiBuilderRequest]);

  const handleNewFile = () => {
    if (!vaultHandle) {
      resetEditor();
    } else {
      createNewFile();
    }
  };

  const handleNewAIFile = async () => {
    if (!vaultHandle) return;

    const subDirs = vaultFiles.filter(
      (f): f is FileSystemDirectoryHandle => (f as any).kind === "directory"
    );
    const folderOptions = [
      { label: `/ ${vaultHandle.name} (root)`, value: "__root__" },
      ...subDirs.map((d) => ({ label: d.name, value: d.name })),
      { label: "+ New Folder", value: "__new_folder__" },
    ];
    const chosenFolder = await dialog.select("Choose a folder for the new file:", folderOptions, "New File");
    if (!chosenFolder) return;

    let targetDir: FileSystemDirectoryHandle = vaultHandle;
    if (chosenFolder === "__new_folder__") {
      const folderName = await dialog.prompt("Enter folder name:", "", "New Folder");
      if (!folderName) return;
      try {
        targetDir = await withRetry(() => vaultHandle.getDirectoryHandle(folderName, { create: true }));
        await scanVault(vaultHandle);
      } catch {
        toast.error("Failed to create folder");
        return;
      }
    } else if (chosenFolder !== "__root__") {
      const found = subDirs.find((d) => d.name === chosenFolder);
      if (found) targetDir = found;
    }

    const result = await dialog.textarea("Describe what you want to write:", "", "Generate Note with AI");
    if (!result?.text?.trim()) return;

    const { text: promptText, referencePaths } = result as { text: string; referencePaths: string[] };

    let fullPrompt = promptText;
    if (referencePaths?.length) {
      const refContents = await Promise.all(
        referencePaths.map(async (refPath) => {
          const handle = vaultFiles.find(
            (f) => (f as any).path === refPath || f.name === refPath
          );
          if (!handle || handle.kind !== "file") return null;
          try {
            const file = await (handle as FileSystemFileHandle).getFile();
            const content = await file.text();
            const name = handle.name.replace(/\.md$/, "");
            return `--- Reference: ${name} ---\n${content}\n--- End Reference ---`;
          } catch {
            return null;
          }
        })
      );
      const joined = refContents.filter(Boolean).join("\n\n");
      if (joined) fullPrompt = `${promptText}\n\n${joined}`;
    }

    const toastId = toast.loading("Generating note...");
    try {
      const { body, title, scope, tags, read_when } = await generateFileFromPrompt(fullPrompt);
      toast.dismiss(toastId);

      const fileName = await dialog.prompt("File name:", title, "Save Note");
      if (!fileName?.trim()) return;

      const tagsStr = (tags ?? []).map((t: string) => t.toLowerCase()).join(", ");
      const readWhenLines = (read_when ?? []).map((r: string) => `  - "${r}"`).join("\n");
      const fm = `---\ntitle: "${title}"\nstatus: draft\nscope: "${scope}"\ntags: [${tagsStr}]\nread_when:\n${readWhenLines}\n---\n\n`;
      await createFile(fileName, fm + body, targetDir);

    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to generate note");
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
      <CommandPaletteProvider>
      <EditorCommands onNewFile={handleNewFile} onExport={handleExport} onSave={() => handleSaveRef.current()} />
      <CommandPalette />
      <LoadingOverlay isVisible={isMounting || isFileLoading || isNavigating || driveAuthState === 'authenticating'} text={isFileLoading ? "Loading file..." : isNavigating ? "Settings..." : driveAuthState === 'authenticating' ? "Connecting to Google Drive..." : "Loading..."} />
      <div className={`fixed inset-0 flex flex-col bg-surface text-fg selection:bg-sage-light/30 font-sans overflow-hidden overscroll-none transition-all duration-500 ${isVaultPending ? "blur-md pointer-events-none select-none" : ""}`}>
        {isMounted && isDriveVault && driveAuthState === 'expired' && (
          <DriveReconnectBanner onReconnect={driveSignIn} />
        )}
        {/* Modals */}
        <WelcomeWizard />
        <VaultSetupWizard />
        <FrontmatterWizard />
        <SchemaWizard />
        <VaultMigrateWizard />
        <NewVaultDialog />
        <ConflictDialog />
        <DocInfoPanel />
        {isVaultPending && <VaultPendingOverlay restoreVault={restoreVault} isDriveVault={isDriveVault} />}
        
        <DialogModal isOpened={pendingFile !== null} onClose={() => setPendingFile(null)} styles="!rounded-[32px] !backdrop-blur-2xl !bg-paper-light/80 dark:!bg-paper-dark/80">
          <div className="flex flex-col gap-6 text-center py-4 px-2">
            <p className="text-lg font-bold tracking-tight">
              Overwrite draft with <br/><span className="text-sage italic">"{pendingFile?.name}"</span>?
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="primary" className="h-11 px-6 rounded-xl" onClick={() => { if (pendingFile) { setContent(pendingFile.text); setFileName(pendingFile.name); } setPendingFile(null); }}>Overwrite</Button>
              <Button variant="secondary" className="h-11 px-6 rounded-xl" onClick={() => setPendingFile(null)}>Cancel</Button>
            </div>
          </div>
        </DialogModal>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".md,.txt,.markdown" className="hidden" />

        {/* --- MAIN LAYOUT --- */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Rail + panel — rail always visible, reflowing the editor as a
            normal flex sibling; the panel next to it toggles the sidebar
            between expanded and collapsed. Mobile uses MobileBottomNav and
            MobileFileOverlay/MobileSearchOverlay instead. */}
        {!isMobileChrome && (
          <div className="flex shrink-0 h-full">
            <IconRail
              activePanel={railPanel}
              onPanelChange={(panel) => setRailPanel((prev) => (prev === panel ? null : panel))}
              onOpenSettings={() => navigateWithGuard("/editor/settings")}
              onOpenDocumentation={() => navigateWithGuard("/documentation")}
              onHome={() => navigateWithGuard("/")}
            />
            <div
              className="h-full overflow-hidden transition-[width] duration-300 ease-in-out shrink-0"
              style={{ width: railPanel !== null ? sidebarWidth : 0 }}
              aria-hidden={railPanel === null}
              inert={railPanel === null ? true : undefined}
            >
              <div
                className={`h-full transition-opacity duration-200 ease-in-out ${
                  railPanel !== null ? "opacity-100" : "opacity-0"
                }`}
                style={{ width: sidebarWidth }}
              >
                <VaultSidebar
                  panel={lastPanel}
                  onNewFile={handleNewFile}
                  onNewAIFile={isAiConfigured ? handleNewAIFile : undefined}
                  onImport={handleImport}
                  onExport={handleExport}
                  onClose={() => setRailPanel(null)}
                  onRefresh={async () => { await syncVault(true); await refreshFiles(); }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Workspace Content */}
        <div className="flex-1 flex min-w-0 bg-surface overflow-hidden relative">
          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            {isMobileChrome && <MobileFileIndicator />}
            <div className={`relative flex-1 min-h-0 ${isMobileChrome ? "pb-14" : ""}`}>
              <main className="h-full">
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
            {isMobileChrome && (
              <MobileBottomNav
                onFiles={() => setIsMobileFileOverlayOpen(true)}
                onSearch={() => setIsMobileSearchOverlayOpen(true)}
                onNewFile={handleNewFile}
              />
            )}
          </div>
        </div>
        </div>{/* end MAIN LAYOUT */}

        {isMobileChrome && (
          <>
            <MobileSelectionToolbar />
            <MobileFileOverlay
              isOpen={isMobileFileOverlayOpen}
              onClose={() => setIsMobileFileOverlayOpen(false)}
            />
            <MobileSearchOverlay
              isOpen={isMobileSearchOverlayOpen}
              onClose={() => setIsMobileSearchOverlayOpen(false)}
            />
          </>
        )}
      </div>
      </CommandPaletteProvider>
    </ErrorBoundary>
  );
}
