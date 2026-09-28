"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { HiOutlineViewGrid } from "react-icons/hi";
import Button from "@/app/components/Button";
import ConflictDialog from "./components/ConflictDialog";
import { useAtom, useAtomValue } from "jotai";
import { atom_fileName, atom_content, atom_activeFileHandle, atom_activeFilePath, atom_workspaceLayout, atom_activePaneId, atom_isFileLoading, findLeaf, getFirstLeaf } from "@/app/atoms/atoms";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import WelcomeWizard from "./components/WelcomeWizard";
import NewVaultDialog from "./components/NewVaultDialog";
import GitHubVaultDialog from "./components/GitHubVaultDialog";
import BrowserVaultDialog from "./components/BrowserVaultDialog";
import WorkspaceSplitter from "./components/WorkspaceSplitter";
import PaneLeaf from "./components/PaneLeaf";
import VaultPendingOverlay from "./components/VaultPendingOverlay";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import LoadingBar from "@/app/components/LoadingBar";
import EditorCommands from "./components/EditorCommands";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import MobileFileOverlay from "./components/MobileFileOverlay";
import MobileFileIndicator from "./components/MobileFileIndicator";
import MobileSelectionToolbar from "./components/MobileSelectionToolbar";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useFileWatcher } from "@/app/hooks/use-file-watcher";
import { useVaultSync } from "@/app/hooks/use-vault-sync";
import { useAutoSave } from "@/app/hooks/use-auto-save";
import { useDialog } from "@/app/hooks/use-dialog";
import toast from "react-hot-toast";
import RepurposeNoteWizard from "./components/RepurposeNoteWizard";
import MermaidDialog from "./components/MermaidDialog";
import ImageDialog from "./components/ImageDialog";
import { useAIEditorActions } from "./hooks/useAIEditorActions";
import AIChatDialog from "./components/AIChatDialog";
import { AIReviewDialog } from "./components/AIReviewDialog";
import { AISelectionToolbar } from "./components/AISelectionToolbar";
import { AIThinkingOverlay } from "./components/AIThinkingOverlay";
import VoicePreviewPanel from "./components/VoicePreviewPanel";
import { useGlobalVoiceInput } from "./hooks/use-global-voice-input";
import { useRouter } from "next/navigation";
import { atom_isAiConfigured, atom_aiBuilderRequest, atom_showCommandPaletteFab, atom_showHiddenFiles } from "@/app/atoms/ui-atoms";
import { usePaneFileActions } from "./hooks/use-pane-file-actions";
import { useDraftImport } from "./hooks/use-draft-import";
import { useEditorShortcuts } from "./hooks/use-editor-shortcuts";
import { useGenerateAiNote } from "./hooks/use-generate-ai-note";
import { useGitHubVaultActions } from "./hooks/use-github-vault-actions";
import { useNavigateWithGuard } from "./hooks/use-navigate-with-guard";
import { useSyncCurrentDirectory } from "./hooks/use-sync-current-directory";
import DraftImportDialog from "./components/DraftImportDialog";

export default function LiteEditor() {
  const router = useRouter();
  const { open: openCommandPalette } = useCommandPalette();
  const [isMounting, setIsMounting] = useState(true);
  const [content, setContent] = useAtom(atom_content);
  const [fileName, setFileName] = useAtom(atom_fileName);
  const [activeFilePath, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, setActiveFileHandle] = useAtom(atom_activeFileHandle);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  // No split panes on mobile — always resolve to a single leaf, ignoring
  // any split tree a desktop session may have saved.
  const mobileLeaf = findLeaf(workspaceLayout.rootContainer, activePaneId) ?? getFirstLeaf(workspaceLayout.rootContainer);
  const { closeTabWithAutosave } = usePaneFileActions(mobileLeaf);
  const isFileLoading = useAtomValue(atom_isFileLoading);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const aiBuilderRequest = useAtomValue(atom_aiBuilderRequest);
  // Single dictation session shared by the whole app (not one per pane), so
  // switching the active pane mid-dictation never drops the in-progress
  // preview — "Insert" lands wherever the active pane currently is.
  // Single AI-chat/actions session shared by the whole app (not one per
  // pane) — targets whichever CM6 view is currently active, same convention
  // as useGlobalVoiceInput.
  const aiActions = useAIEditorActions();
  const {
    isVoiceSupported,
    isVoiceListening,
    toggleVoiceListening,
    voicePreviewText,
    setVoicePreviewText,
    voiceInterimText,
    commitVoicePreview,
    discardVoicePreview,
  } = useGlobalVoiceInput();
  const isMobileChrome = useIsMobileChrome();
  const showCommandPaletteFab = useAtomValue(atom_showCommandPaletteFab);
  const [isMobileFileOverlayOpen, setIsMobileFileOverlayOpen] = useState(false);
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
    chooseTargetDirectory,
    scanVault,
    indexVaultTags,
    syncCurrentDirectoryToPath,
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
  // from outside the editor; the actual open() call has to happen here since
  // it needs the current selection at request time, not whenever this atom
  // last changed.
  const { openChat: openAiChat } = aiActions;
  const prevAiBuilderRequestRef = useRef(aiBuilderRequest);
  useEffect(() => {
    if (aiBuilderRequest !== prevAiBuilderRequestRef.current) {
      prevAiBuilderRequestRef.current = aiBuilderRequest;
      openAiChat();
    }
  }, [aiBuilderRequest, openAiChat]);

  useSyncCurrentDirectory(activeFilePath, isVaultPending, syncCurrentDirectoryToPath);

  const { handleImport, fileInputRef, handleFileChange, pendingDraft, confirmPendingDraft, cancelPendingDraft } =
    useDraftImport(importFile);

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
      const targetDir = await chooseTargetDirectory();
      if (!targetDir) return;

      const name = await dialog.prompt("Enter file name:", fileName.replace(".md", ""), "Save to Vault");
      if (name) {
        await createFile(name, content, targetDir);
      }
    } else {
      await exportFile(content, fileName);
    }
  }, [content, activeFileHandle, vaultHandle, saveFile, exportFile, fileName, dialog, createFile, chooseTargetDirectory]);

  const { isGitHubVault, runGitHubCommitCommand, runGitHubPullCommand } = useGitHubVaultActions({
    vaultHandle,
    activeFileHandle,
    saveFile,
    refreshVault: handleRefreshVault,
  });

  // Shortcut Listener with Ref Pattern for stability
  const handleSaveRef = useRef(handleSave);
  const handleNewFileRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const { navigateWithGuard, navigatingLabel } = useNavigateWithGuard(handleSaveRef);

  useEditorShortcuts({
    navigateWithGuard,
    saveRef: handleSaveRef,
    newFileRef: handleNewFileRef,
    activeTabPath: mobileLeaf.activeFilePath,
    closeTabWithAutosave,
    isVoiceSupported,
    toggleVoiceListening,
    flush,
  });

  const resetEditor = useCallback(() => {
    setContent("");
    setFileName("untitled");
    setActiveFileHandle(null);
    setActiveFilePath("draft");
    hasPromptedForNameRef.current = false;
    toast.success("New draft started");
  }, [setActiveFileHandle, setActiveFilePath, setContent, setFileName]);

  const handleNewFile = useCallback(async () => {
    if (!vaultHandle) {
      resetEditor();
      return;
    }

    await createNewFile();
  }, [createNewFile, resetEditor, vaultHandle]);

  useEffect(() => {
    handleNewFileRef.current = handleNewFile;
  }, [handleNewFile]);

  const handleNewAIFile = useGenerateAiNote({ vaultHandle, vaultFiles, chooseTargetDirectory, createFile });

  const handleExport = async () => {
    if (!content.trim()) return;

    if (activeFileHandle) {
      const success = await saveFile(content);
      if (success) return;
    }
    await exportFile(content, fileName);
  };


  return (
    <ErrorBoundary onGoHome={() => router.push("/")}>
      <EditorCommands
        onNewFile={handleNewFile}
        onExport={handleExport}
        githubVault={isGitHubVault}
        onGitHubCommit={() => void runGitHubCommitCommand()}
        onGitHubPush={() => void runGitHubCommitCommand()}
        onGitHubSync={() => void runGitHubCommitCommand()}
        onGitHubPull={() => void runGitHubPullCommand()}
        onSave={() => handleSaveRef.current()}
        isMobileChrome={isMobileChrome}
        onOpenMobileFiles={() => setIsMobileFileOverlayOpen(true)}
        onOpenTasks={() => navigateWithGuard("/editor/tasks", "Tasks")}
        onHome={() => navigateWithGuard("/", "Home")}
        onOpenDocumentation={() => navigateWithGuard("/documentation", "Documentation")}
        onRefreshVault={handleRefreshVault}
        onImport={handleImport}
        onNewAIFile={handleNewAIFile}
        onRunAIAction={aiActions.runAIActionById}
        isVoiceSupported={isVoiceSupported}
        isVoiceListening={isVoiceListening}
        onToggleVoice={toggleVoiceListening}
        onCommitVoice={commitVoicePreview}
        onDiscardVoice={discardVoicePreview}
        hasVoicePreview={voicePreviewText.length > 0 || voiceInterimText !== null}
      />
      <LoadingOverlay isVisible={isMounting || !!navigatingLabel} text={navigatingLabel ? `${navigatingLabel}...` : "Loading..."} />
      {/* Switching files keeps the editor on screen; a slim bar (shown only if
          it takes >150ms) signals the read + re-render instead of a full veil. */}
      <LoadingBar isVisible={isFileLoading && !isMounting} label="Opening file" />
      <div className={`fixed inset-0 flex flex-col bg-surface text-fg selection:bg-sage-light/30 font-sans overflow-hidden overscroll-none transition-all duration-500 ${isVaultPending ? "blur-md pointer-events-none select-none" : ""}`}>
        <h1 className="sr-only">HermesMarkdown Editor</h1>
        {/* Modals */}
        <WelcomeWizard />
        <NewVaultDialog />
        <GitHubVaultDialog />
        <BrowserVaultDialog />
        <ConflictDialog />
        <RepurposeNoteWizard />
        {isVaultPending && <VaultPendingOverlay restoreVault={restoreVault} />}
        <MermaidDialog />
        <ImageDialog />
        
        <DraftImportDialog pendingDraft={pendingDraft} onConfirm={confirmPendingDraft} onCancel={cancelPendingDraft} />

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".md,.txt,.markdown" className="hidden" />

        {/* --- MAIN LAYOUT --- */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">

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
              <main
                className="h-full"
              >
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
        {showCommandPaletteFab && !isMobileChrome && (
          <Button
            variant="unstyled"
            onClick={() => openCommandPalette()}
            className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-sage text-white shadow-lg ring-1 ring-black/10 transition-all duration-200 hover:scale-105 hover:bg-sage-hover hover:shadow-xl active:scale-95 dark:text-surface dark:ring-white/10"
            aria-label="Open command palette"
            title="Command palette (Ctrl/Cmd+K)"
          >
            <HiOutlineViewGrid size={19} />
          </Button>
        )}

        {isAiConfigured && !isMobileChrome && (
          <AISelectionToolbar
            isAiLoading={aiActions.isAiLoading}
            onAsk={aiActions.openChat}
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
        <VoicePreviewPanel
          isListening={isVoiceListening}
          previewText={voicePreviewText}
          onPreviewTextChange={setVoicePreviewText}
          interimText={voiceInterimText}
          onCommit={commitVoicePreview}
          onDiscard={() => {
            discardVoicePreview();
            if (isVoiceListening) toggleVoiceListening();
          }}
        />

        {isMobileChrome && (
          <>
            <MobileSelectionToolbar />
            <MobileFileOverlay
              isOpen={isMobileFileOverlayOpen}
              onClose={() => setIsMobileFileOverlayOpen(false)}
              onImport={handleImport}
              onExport={handleExport}
            />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
