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
  atom_activePaneId,
  atom_isFileLoading,
  atom_sidebarWidth,
  findLeaf,
  getFirstLeaf,
} from "@/app/atoms/atoms";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import VaultSidebar from "./components/VaultSidebar";
import SidebarRail from "./components/SidebarRail";
import WelcomeWizard from "./components/WelcomeWizard";
import NewVaultDialog from "./components/NewVaultDialog";
import WorkspaceSplitter from "./components/WorkspaceSplitter";
import PaneLeaf from "./components/PaneLeaf";
import VaultPendingOverlay from "./components/VaultPendingOverlay";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import EditorCommands from "./components/EditorCommands";
import { CommandPaletteProvider } from "@/app/components/CommandPalette/CommandPaletteContext";
import CommandPalette from "@/app/components/CommandPalette/CommandPalette";
import KeyboardShortcutsOverlay from "@/app/components/KeyboardShortcutsOverlay/KeyboardShortcutsOverlay";
import MobileFileOverlay from "./components/MobileFileOverlay";
import MobileTasksOverlay from "./components/MobileTasksOverlay";
import MobileFileIndicator from "./components/MobileFileIndicator";
import MobileSelectionToolbar from "./components/MobileSelectionToolbar";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useFileWatcher } from "@/app/hooks/use-file-watcher";
import { useVaultSync } from "@/app/hooks/use-vault-sync";
import { useAutoSave } from "@/app/hooks/use-auto-save";
import { useDialog } from "@/app/hooks/use-dialog";
import toast from "react-hot-toast";
import { showErrorToast } from "@/app/components/Toastr";
import { useGlobalVoiceInput } from "./hooks/use-global-voice-input";
import VoicePreviewPanel from "./components/VoicePreviewPanel";
import RepurposeNoteWizard from "./components/RepurposeNoteWizard";
import { useAIEditorActions } from "./hooks/useAIEditorActions";
import AIChatDialog from "./components/AIChatDialog";
import { AIReviewDialog } from "./components/AIReviewDialog";
import { AISelectionToolbar } from "./components/AISelectionToolbar";
import { AIThinkingOverlay } from "./components/AIThinkingOverlay";


import { useRouter } from "next/navigation";
import { atom_isAiConfigured, atom_aiBuilderRequest, atom_railPanel, atom_showHiddenFiles, RailPanel, atom_voiceInputRequest, atom_isVoiceInputListening, atom_isVoiceInputSupported, atom_activeEditorView, atom_isSidebarResizing, atom_keyboardShortcutsOpen } from "@/app/atoms/ui-atoms";
import { generateFileFromPrompt } from "@/app/services/ai";
import { withRetry } from "@/app/hooks/file-system/shared";

export default function LiteEditor() {
  const router = useRouter();
  const [isMounting, setIsMounting] = useState(true);
  const [navigatingLabel, setNavigatingLabel] = useState<string | null>(null);
  const [content, setContent] = useAtom(atom_content);
  const lastSavedContent = useAtomValue(atom_lastSavedContent);
  const [fileName, setFileName] = useAtom(atom_fileName);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  // No split panes on mobile — always resolve to a single leaf, ignoring
  // any split tree a desktop session may have saved.
  const mobileLeaf = findLeaf(workspaceLayout.rootContainer, activePaneId) ?? getFirstLeaf(workspaceLayout.rootContainer);
  const [railPanel, setRailPanel] = useAtom(atom_railPanel);
  const [, setKeyboardShortcutsOpen] = useAtom(atom_keyboardShortcutsOpen);
  const sidebarWidth = useAtomValue(atom_sidebarWidth);
  const isSidebarResizing = useAtomValue(atom_isSidebarResizing);
  // Kept mounted while collapsing/expanding so the wrapper's width transition
  // (below) can animate smoothly instead of the panel popping in/out on unmount.
  const [lastPanel, setLastPanel] = useState<RailPanel>(railPanel ?? "files");
  useEffect(() => {
    if (railPanel !== null) setLastPanel(railPanel);
  }, [railPanel]);
  // Rail icon click: open/switch to that panel, or collapse if it's already
  // the one showing. The rail itself is always visible, so there's no
  // separate "reveal" step — a click just toggles the detail panel beside it.
  const handleSelectPanel = useCallback((id: RailPanel) => {
    setRailPanel((prev) => (prev === id ? null : id));
  }, [setRailPanel]);
  const isFileLoading = useAtomValue(atom_isFileLoading);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const [aiBuilderRequest, setAiBuilderRequest] = useAtom(atom_aiBuilderRequest);
  const [, setVoiceInputRequest] = useAtom(atom_voiceInputRequest);
  const isVoiceListening = useAtomValue(atom_isVoiceInputListening);
  const isVoiceSupported = useAtomValue(atom_isVoiceInputSupported);
  // Single dictation session shared by the whole app (not one per pane), so
  // switching the active pane mid-dictation never drops the in-progress
  // preview — "Insert" lands wherever the active pane currently is.
  const {
    voiceError,
    voicePreviewText,
    setVoicePreviewText,
    voiceInterimText,
    commitVoicePreview,
    discardVoicePreview,
    toggleVoiceListening,
  } = useGlobalVoiceInput();
  const activeEditorView = useAtomValue(atom_activeEditorView);
  // Single AI-chat/actions session shared by the whole app (not one per
  // pane) — targets whichever CM6 view is currently active, same convention
  // as useGlobalVoiceInput.
  const aiActions = useAIEditorActions();
  const isMobileChrome = useIsMobileChrome();
  const [isMobileFileOverlayOpen, setIsMobileFileOverlayOpen] = useState(false);
  const [isMobileTasksOverlayOpen, setIsMobileTasksOverlayOpen] = useState(false);
  const {
    vaultHandle,
    vaultFiles,
    activeFileHandle,
    isVaultPending,
    restoreVault,
    saveFile,
    exportFile,
    importFile,
    createFile,
    createNewFile,
    scanVault,
    indexVaultTags,
    syncSidebarToPath,
  } = useFileSystem();
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const handleRefreshVault = useCallback(() => {
    if (!vaultHandle) return;
    scanVault(vaultHandle as any, showHiddenFiles);
    indexVaultTags?.(vaultHandle as any, showHiddenFiles);
  }, [vaultHandle, showHiddenFiles, scanVault, indexVaultTags]);

  const dialog = useDialog();
  const hasPromptedForNameRef = useRef(false);

  // Run sync hooks
  const { flush } = useAutoSave(() => {
    if (!activeFileHandle && vaultHandle && !hasPromptedForNameRef.current) {
      hasPromptedForNameRef.current = true;
      handleSave();
    }
  });
  useFileWatcher();
  useVaultSync();

  // "Open AI Chat" (keyboard shortcut / command palette) bumps this counter
  // from outside the editor, the same request/mirror pattern voice input
  // uses — the actual open() call has to happen here since it needs the
  // current selection at request time, not whenever this atom last changed.
  const { openChat: openAiChat } = aiActions;
  const prevAiBuilderRequestRef = useRef(aiBuilderRequest);
  useEffect(() => {
    if (aiBuilderRequest !== prevAiBuilderRequestRef.current) {
      prevAiBuilderRequestRef.current = aiBuilderRequest;
      openAiChat();
    }
  }, [aiBuilderRequest, openAiChat]);

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

  useEffect(() => {
    if (voiceError === "permission-denied") {
      showErrorToast("Microphone access was denied");
    } else if (voiceError === "network") {
      showErrorToast("Voice input lost its network connection");
    } else if (voiceError === "no-microphone") {
      showErrorToast("No microphone was found");
    }
  }, [voiceError]);

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

  const navigateWithGuard = useCallback(async (path: string, label: string) => {
    const isDirty = content !== lastSavedContent && content.trim() !== "";
    if (!isDirty) {
      setNavigatingLabel(label);
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
      setNavigatingLabel(label);
      router.push(path);
    } else if (choice === "discard") {
      setNavigatingLabel(label);
      router.push(path);
    }
  }, [content, lastSavedContent, router, dialog]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // The voice preview panel renders through a React Portal into
      // document.body, outside this app's DOM subtree — but its keystrokes
      // still reach this window-level listener via native DOM bubbling.
      // Its own textarea already owns Enter/Escape, so every other global
      // shortcut here (Ctrl+B, Ctrl+S, sidebar toggles, ...) needs to stay
      // out of it entirely rather than double-firing against the real
      // document.
      if ((e.target as HTMLElement)?.closest?.("[data-voice-preview-panel]")) return;

      // Prevent tablet/mobile browsers from navigating back on ESC.
      if (e.key === "Escape") e.preventDefault();

      // Escape collapses the sidebar
      if (e.key === "Escape" && railPanel !== null) {
        setRailPanel(null);
      }

      // Expand/collapse sidebar
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setRailPanel((prev) => (prev !== null ? null : lastPanel));
      }

      // AI Builder — on-demand, not a status bar button
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        if (isAiConfigured) {
          e.preventDefault();
          setAiBuilderRequest((v) => v + 1);
        }
      }

      // Voice input — toggle start/stop
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "v") {
        if (isVoiceSupported) {
          e.preventDefault();
          setVoiceInputRequest((v) => v + 1);
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
  }, [flush, railPanel, setRailPanel, lastPanel, isAiConfigured, setAiBuilderRequest, isVoiceSupported, setVoiceInputRequest]);

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
      <EditorCommands
        onNewFile={handleNewFile}
        onExport={handleExport}
        onSave={() => handleSaveRef.current()}
        isMobileChrome={isMobileChrome}
        onOpenMobileFiles={() => setIsMobileFileOverlayOpen(true)}
        onOpenMobileTasks={() => setIsMobileTasksOverlayOpen(true)}
        onHome={() => navigateWithGuard("/", "Home")}
        onOpenDocumentation={() => navigateWithGuard("/documentation", "Documentation")}
        onRefreshVault={handleRefreshVault}
      />
      <CommandPalette />
      <KeyboardShortcutsOverlay />
      <LoadingOverlay isVisible={isMounting || isFileLoading || !!navigatingLabel} text={isFileLoading ? "Loading file..." : navigatingLabel ? `${navigatingLabel}...` : "Loading..."} />
      <div className={`fixed inset-0 flex flex-col bg-surface text-fg selection:bg-sage-light/30 font-sans overflow-hidden overscroll-none transition-all duration-500 ${isVaultPending ? "blur-md pointer-events-none select-none" : ""}`}>
        {/* Modals */}
        <WelcomeWizard />
        <NewVaultDialog />
        <ConflictDialog />
        <RepurposeNoteWizard />
        {isVaultPending && <VaultPendingOverlay restoreVault={restoreVault} />}
        
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

        {/* Icon rail (SidebarRail) stays out of the way on desktop until a
            panel is open or the edge is hovered — a thin 8px grip peeks out
            and the full rail slides in over the content. Once a panel is
            open the rail takes its normal place in the layout so it doesn't
            vanish mid-use. Also reachable via the command palette and
            Ctrl+Shift+E. Mobile uses MobileFileOverlay/MobileTasksOverlay
            instead. */}
        {!isMobileChrome && (
          <div className="flex shrink-0 h-full items-center">
            {railPanel !== null ? (
              <SidebarRail
                panel={railPanel}
                onSelectPanel={handleSelectPanel}
                onSettings={() => navigateWithGuard("/editor/settings", "Settings")}
                onRefreshVault={handleRefreshVault}
                onOpenAIChat={isAiConfigured ? openAiChat : undefined}
                onOpenDocumentation={() => navigateWithGuard("/documentation", "Documentation")}
                onOpenKeyboardShortcuts={() => setKeyboardShortcutsOpen(true)}
              />
            ) : (
              <div className="group/railzone relative h-full w-2 shrink-0">
                <div className="absolute left-0 top-0 h-full w-14 -translate-x-[calc(100%-0.5rem)] group-hover/railzone:translate-x-0 transition-transform duration-200 ease-in-out z-30">
                  <SidebarRail
                    panel={railPanel}
                    onSelectPanel={handleSelectPanel}
                    onSettings={() => navigateWithGuard("/editor/settings", "Settings")}
                    onRefreshVault={handleRefreshVault}
                    onOpenAIChat={isAiConfigured ? openAiChat : undefined}
                    onOpenDocumentation={() => navigateWithGuard("/documentation", "Documentation")}
                    onOpenKeyboardShortcuts={() => setKeyboardShortcutsOpen(true)}
                  />
                </div>
              </div>
            )}
            <div
              className={`h-full overflow-hidden shrink-0 ${isSidebarResizing ? "" : "transition-[width] duration-300 ease-in-out"}`}
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
                />
              </div>
            </div>
          </div>
        )}

        {/* Workspace Content */}
        <div className="flex-1 flex min-w-0 bg-surface overflow-hidden relative">
          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            {isMobileChrome && (
              <MobileFileIndicator
                onSave={() => handleSaveRef.current()}
                onOpenAIChat={isAiConfigured ? openAiChat : undefined}
              />
            )}
            <div className="relative flex-1 min-h-0">
              <main className="h-full">
                {isMounting ? (
                  <div className="animate-pulse opacity-10 space-y-6 pt-20 px-12 max-w-2xl mx-auto">
                    <div className="h-8 bg-current w-1/3 rounded-lg mb-16" />
                    <div className="h-4 bg-current w-full rounded-md" />
                    <div className="h-4 bg-current w-11/12 rounded-md" />
                    <div className="h-4 bg-current w-5/6 rounded-md" />
                  </div>
                ) : isMobileChrome ? (
                  <PaneLeaf leaf={mobileLeaf} />
                ) : (
                  <WorkspaceSplitter node={workspaceLayout.rootContainer} />
                )}
              </main>
            </div>
          </div>
        </div>
        </div>{/* end MAIN LAYOUT */}

        <VoicePreviewPanel
          isListening={isVoiceListening}
          previewText={voicePreviewText}
          onPreviewTextChange={setVoicePreviewText}
          interimText={voiceInterimText}
          onCommit={commitVoicePreview}
          onDiscard={() => {
            discardVoicePreview();
            if (isVoiceListening) toggleVoiceListening();
            activeEditorView?.focus();
          }}
        />

        {isAiConfigured && !isMobileChrome && (
          <AISelectionToolbar
            isAiLoading={aiActions.isAiLoading}
            onPrompt={aiActions.runPrompt}
          />
        )}
        <AIChatDialog
          isOpen={aiActions.isChatOpen}
          onClose={aiActions.closeChat}
          documentContent={content}
          selectedText={aiActions.chatSelectedText}
          currentFilePath={activeFilePath ?? undefined}
          onApply={aiActions.applyFromChat}
        />
        <AIReviewDialog
          review={aiActions.aiReview}
          onClose={aiActions.dismissReview}
          onReplace={aiActions.applyReplace}
          onInsertBelow={aiActions.applyInsertBelow}
        />
        {aiActions.isAiLoading && <AIThinkingOverlay />}

        {isMobileChrome && (
          <>
            <MobileSelectionToolbar />
            <MobileFileOverlay
              isOpen={isMobileFileOverlayOpen}
              onClose={() => setIsMobileFileOverlayOpen(false)}
              onImport={handleImport}
              onExport={handleExport}
            />
            <MobileTasksOverlay
              isOpen={isMobileTasksOverlayOpen}
              onClose={() => setIsMobileTasksOverlayOpen(false)}
            />
          </>
        )}
      </div>
      </CommandPaletteProvider>
    </ErrorBoundary>
  );
}
