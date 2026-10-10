"use client";

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import ConflictDialog from "./components/ConflictDialog";
import { useAtomValue } from "jotai";
import { atom_fileName, atom_content, atom_activeFilePath, atom_workspaceLayout, atom_activePaneId, atom_isFileLoading, atom_isVaultRestoring, findLeaf, getFirstLeaf } from "@/app/atoms/atoms";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import WelcomeWizard from "./components/WelcomeWizard";
import NewVaultDialog from "./components/NewVaultDialog";
import GitHubVaultDialog from "./components/GitHubVaultDialog";
import BrowserVaultDialog from "./components/BrowserVaultDialog";
import WorkspaceSplitter from "./components/WorkspaceSplitter";
import PaneLeaf from "./components/PaneLeaf";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import LoadingBar from "@/app/components/LoadingBar";
import EditorCommands from "./components/EditorCommands";
import MobileFileOverlay from "./components/MobileFileOverlay";
import MobileFileIndicator from "./components/MobileFileIndicator";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import SelectionToolbar from "./components/SelectionToolbar";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useFileWatcher } from "@/app/hooks/use-file-watcher";
import { useVaultSync } from "@/app/hooks/use-vault-sync";
import { useAutoSave } from "@/app/hooks/use-auto-save";
import RepurposeNoteWizard from "./components/RepurposeNoteWizard";
import MermaidDialog from "./components/MermaidDialog";
import RenderedBlockSourceDialog from "./components/RenderedBlockSourceDialog";
import ImageDialog from "./components/ImageDialog";
import TokenCostDialog from "./components/TokenCostDialog";
import { useAIEditorActions } from "./hooks/useAIEditorActions";
import AIChatDialog from "./components/AIChatDialog";
import { AIReviewDialog } from "./components/AIReviewDialog";
import { AIThinkingOverlay } from "./components/AIThinkingOverlay";
import VoicePreviewPanel from "./components/VoicePreviewPanel";
import { useGlobalVoiceInput } from "./hooks/use-global-voice-input";
import { useRouter } from "next/navigation";
import { atom_isAiConfigured, atom_aiBuilderRequest, atom_showHiddenFiles, atom_hideChromeWhileTyping, atom_sidebarOpen, atom_sidebarWidth } from "@/app/atoms/ui-atoms";
import { usePaneFileActions } from "./hooks/use-pane-file-actions";
import { useDraftImport } from "./hooks/use-draft-import";
import { useToolHandoff } from "./hooks/use-tool-handoff";
import { useEditorShortcuts } from "./hooks/use-editor-shortcuts";
import { useGenerateAiNote } from "./hooks/use-generate-ai-note";
import { useGitHubVaultActions } from "./hooks/use-github-vault-actions";
import { useNavigateWithGuard } from "./hooks/use-navigate-with-guard";
import { useSyncCurrentDirectory } from "./hooks/use-sync-current-directory";
import DraftImportDialog from "./components/DraftImportDialog";
import DraftFolderDialog from "./components/DraftFolderDialog";
import { useDraftFlow } from "./hooks/use-draft-flow";
import { useHomeFeed } from "./hooks/use-home-feed";
import HomeFeed from "./components/HomeFeed";
import { HomeFeedSkeleton } from "./components/EditorSkeleton";
import { useVaultOpenBehavior } from "./hooks/use-vault-open-behavior";
import { useRecentVaultTracker } from "./hooks/use-recent-vaults";
import { useFadeChromeWhileTyping } from "./hooks/use-fade-chrome-while-typing";

export default function LiteEditor() {
  const router = useRouter();
  const [isMounting, setIsMounting] = useState(true);
  const content = useAtomValue(atom_content);
  const fileName = useAtomValue(atom_fileName);
  const activeFilePath = useAtomValue(atom_activeFilePath);
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
  const [isMobileFileOverlayOpen, setIsMobileFileOverlayOpen] = useState(false);
  const {
    vaultHandle,
    vaultFiles,
    activeFileHandle,
    isVaultPending,
    saveFile,
    exportFile,
    importFile,
    createFile,
    openFile,
    chooseTargetDirectory,
    scanVault,
    indexVaultTags,
    syncCurrentDirectoryToPath,
    openTodayNote,
  } = useFileSystem();
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const handleRefreshVault = useCallback(() => {
    if (!vaultHandle) return;
    scanVault(vaultHandle as any, showHiddenFiles);
    indexVaultTags?.(vaultHandle as any, showHiddenFiles);
  }, [vaultHandle, showHiddenFiles, scanVault, indexVaultTags]);

  const { materializeDraft, handleDraftAutosave, handleNewFile } = useDraftFlow({ vaultHandle, scanVault, indexVaultTags });

  // Run sync hooks
  const { flush } = useAutoSave(handleDraftAutosave);
  useFileWatcher();
  useVaultSync();
  useVaultOpenBehavior();
  useRecentVaultTracker();
  const hideChromeWhileTyping = useAtomValue(atom_hideChromeWhileTyping);
  useFadeChromeWhileTyping(hideChromeWhileTyping);
  const sidebarOpen = useAtomValue(atom_sidebarOpen);
  const sidebarWidth = useAtomValue(atom_sidebarWidth);

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
  // Until the saved vault is readable, neither the editor nor the home feed
  // is shown — only the skeleton. VaultAccessGate (editor layout) shows the
  // Restore Access prompt over every /editor route.
  const isVaultRestoring = useAtomValue(atom_isVaultRestoring);
  const isVaultLocked = isVaultRestoring || isVaultPending;

  const { handleImport, fileInputRef, handleFileChange, pendingDraft, offerDraft, confirmPendingDraft, cancelPendingDraft } =
    useDraftImport(importFile);
  useToolHandoff({ offerDraft, isVaultLocked });

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
      await materializeDraft();
    } else {
      await exportFile(content, fileName);
    }
  }, [content, activeFileHandle, vaultHandle, saveFile, exportFile, fileName, materializeDraft]);

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

  useEffect(() => {
    handleNewFileRef.current = handleNewFile;
  }, [handleNewFile]);

  const { isHomeFeedOpen, feedProps } = useHomeFeed({
    hasVault: !!vaultHandle,
    openFile,
    newNote: handleNewFile,
    materializeDraft,
    importFile: handleImport,
    openTodayNote: () => openTodayNote(),
  });

  const handleNewAIFile = useGenerateAiNote({ vaultHandle, vaultFiles, chooseTargetDirectory, createFile });

  const handleExport = async () => {
    if (!content.trim()) return;

    if (activeFileHandle) {
      const success = await saveFile(content);
      if (success) return;
    }
    await exportFile(content, fileName);
  };


  // Once the chrome fades, a single pane's text re-centres on the window
  // rather than on the space beside the faded sidebar (editor.scss).
  const centringShift =
    !isMobileChrome && !isVaultLocked && !isHomeFeedOpen && sidebarOpen && "type" in workspaceLayout.rootContainer
      ? `${sidebarWidth / 2}px`
      : "0px";

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
      {/* On the feed, its skeleton (gate, then the main area) leads straight into it. */}
      <LoadingOverlay isVisible={(isMounting && !isHomeFeedOpen) || !!navigatingLabel} text={navigatingLabel ? `${navigatingLabel}...` : "Loading..."} />
      {/* Switching files keeps the editor on screen; a slim bar (shown only if
          it takes >150ms) signals the read + re-render instead of a full veil. */}
      <LoadingBar isVisible={isFileLoading && !isMounting} label="Opening file" />
      <div
        className={`typing-page fixed inset-0 flex flex-col bg-surface text-fg selection:bg-sage-light/30 font-sans overflow-hidden overscroll-none transition-all duration-500`}
        style={{ "--typing-shift": centringShift } as CSSProperties}
      >
        <h1 className="sr-only">HermesMarkdown Editor</h1>
        {/* Modals */}
        <WelcomeWizard />
        <NewVaultDialog />
        <GitHubVaultDialog />
        <BrowserVaultDialog />
        <ConflictDialog />
        <RepurposeNoteWizard />
        {/* Before MermaidDialog, so its "Open viewer" stacks on top. */}
        <RenderedBlockSourceDialog />
        <MermaidDialog />
        <ImageDialog />
        <TokenCostDialog />
        
        <DraftImportDialog pendingDraft={pendingDraft} onConfirm={confirmPendingDraft} onCancel={cancelPendingDraft} />
        {!isVaultLocked && <DraftFolderDialog />}

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".md,.txt,.markdown" className="hidden" />

        {/* --- MAIN LAYOUT --- */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Sidebar: navigation on the window's leading edge (desktop). The home
            feed is a full-width landing view, so it has none. */}
        {!isMobileChrome && !isVaultLocked && !isHomeFeedOpen && (
          // A wrapper takes the fade: the sidebar's own transition is its slide.
          <div className="typing-chrome shrink-0 flex">
            <WorkspaceSidebar />
          </div>
        )}

        {/* Workspace Content */}
        <div className="flex-1 flex min-w-0 bg-surface overflow-hidden relative">
          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            {isMobileChrome && !isHomeFeedOpen && !isVaultLocked && (
              <MobileFileIndicator
                onSave={() => handleSaveRef.current()}
                onOpenAIChat={isAiConfigured ? openAiChat : undefined}
              />
            )}
            <div className="relative flex-1 min-h-0">
              <main
                className="h-full"
              >
                {(isMounting || isVaultLocked) && isHomeFeedOpen ? (
                  <HomeFeedSkeleton />
                ) : isMounting || isVaultLocked ? (
                  <div className="animate-pulse opacity-10 space-y-6 pt-20 px-12 max-w-2xl mx-auto">
                    <div className="h-8 bg-current w-1/3 rounded-lg mb-16" />
                    <div className="h-4 bg-current w-full rounded-md" />
                    <div className="h-4 bg-current w-11/12 rounded-md" />
                    <div className="h-4 bg-current w-5/6 rounded-md" />
                  </div>
                ) : isHomeFeedOpen ? (
                  <HomeFeed {...feedProps} />
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

        <SelectionToolbar
          placement={isMobileChrome ? "docked" : "above"}
          onAsk={isAiConfigured ? aiActions.openChat : undefined}
          isAiLoading={aiActions.isAiLoading}
        />
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
