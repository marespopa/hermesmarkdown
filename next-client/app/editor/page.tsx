"use client";

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import ConflictDialog from "./components/ConflictDialog";
import { useAtom, useAtomValue } from "jotai";
import { atom_fileName, atom_content, atom_activeFilePath, atom_workspaceLayout, atom_isFileLoading, atom_isVaultRestoring, contentStore } from "@/app/atoms/atoms";
import { flushAllBoardWrites } from "@/app/utils/board/board-flush";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import useVisibleViewport from "@/app/hooks/use-visible-viewport";
import FolderPrompt from "./components/FolderPrompt";
import PaneLeaf from "./components/PaneLeaf";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import LoadingBar from "@/app/components/LoadingBar";
import EditorCommands from "./components/EditorCommands";
import MobileFileIndicator from "./components/MobileFileIndicator";
import SelectionToolbar from "./components/SelectionToolbar";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useFileWatcher } from "@/app/hooks/use-file-watcher";
import AutoSave from "./components/AutoSave";
import MermaidDialog from "./components/MermaidDialog";
import RenderedBlockSourceDialog from "./components/RenderedBlockSourceDialog";
import ImageDialog from "./components/ImageDialog";
import TokenCostDialog from "./components/TokenCostDialog";
import PdfExport from "./components/PdfExport";
import { useRouter } from "next/navigation";
import { atom_isAiConfigured, atom_aiBuilderRequest, atom_showHiddenFiles, atom_newNoteRequested, atom_saveRequested } from "@/app/atoms/ui-atoms";
import { usePaneFileActions } from "./hooks/use-pane-file-actions";
import { useDraftImport } from "./hooks/use-draft-import";
import { useToolHandoff } from "./hooks/use-tool-handoff";
import { useEditorShortcuts } from "./hooks/use-editor-shortcuts";
import { useNavigateWithGuard } from "./hooks/use-navigate-with-guard";
import { useSyncCurrentDirectory } from "./hooks/use-sync-current-directory";
import DraftImportDialog from "./components/DraftImportDialog";
import { useDraftFlow } from "./hooks/use-draft-flow";
import { usePaletteCreateNote } from "./hooks/use-palette-create-note";
import { useActiveFileUrlSync } from "./hooks/use-active-file-url";
import { useFirstRun } from "./hooks/use-first-run";
import { useChooseFolder } from "./hooks/use-choose-folder";
import { showSuccessToast } from "@/app/components/Toastr";
import { useOpenCompanion } from "./components/companion/use-open-companion";
import { downloadMarkdown } from "@/app/utils/download-markdown";

export default function LiteEditor() {
  const router = useRouter();
  const [isMounting, setIsMounting] = useState(true);
  const fileName = useAtomValue(atom_fileName);
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const leaf = workspaceLayout.rootContainer;
  const { closeTabWithAutosave } = usePaneFileActions(leaf);
  const isFileLoading = useAtomValue(atom_isFileLoading);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const aiBuilderRequest = useAtomValue(atom_aiBuilderRequest);
  const isMobileChrome = useIsMobileChrome();
  const visibleViewport = useVisibleViewport();
  const {
    vaultHandle,
    activeFileHandle,
    isVaultPending,
    saveFile,
    exportFile,
    importFile,
    openFile,
    scanVault,
    indexVaultTags,
    syncCurrentDirectoryToPath,
    isVaultSupported,
    isBrowserVaultSupported,
  } = useFileSystem();
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const handleRefreshVault = useCallback(() => {
    if (!vaultHandle) return;
    scanVault(vaultHandle as any, showHiddenFiles);
    indexVaultTags?.(vaultHandle as any, showHiddenFiles);
  }, [vaultHandle, showHiddenFiles, scanVault, indexVaultTags]);

  const { materializeDraft, handleDraftAutosave, handleNewFile } = useDraftFlow({ vaultHandle, scanVault, indexVaultTags });

  // Run sync hooks
  // Autosave follows the note's text in its own component (AutoSave), so
  // typing doesn't re-render this page.
  const autoSaveFlushRef = useRef<() => Promise<void>>(async () => {});
  const flush = useCallback(() => autoSaveFlushRef.current(), []);
  useFileWatcher();
  useFirstRun(isMobileChrome);
  const chooseFolder = useChooseFolder(materializeDraft);

  // Ask AI (Ctrl/Cmd+J, the palette, the slash menu) bumps
  // this counter from outside the editor; the companion opens here with the
  // selection read at request time, not whenever this atom last changed.
  const openCompanion = useOpenCompanion();
  const prevAiBuilderRequestRef = useRef(aiBuilderRequest);
  useEffect(() => {
    if (aiBuilderRequest !== prevAiBuilderRequestRef.current) {
      prevAiBuilderRequestRef.current = aiBuilderRequest;
      openCompanion();
    }
  }, [aiBuilderRequest, openCompanion]);

  useSyncCurrentDirectory(activeFilePath, isVaultPending, syncCurrentDirectoryToPath);
  // Until the saved vault is readable, the editor
  // is shown — only the skeleton. VaultAccessGate (editor layout) shows the
  // Restore Access prompt over every /editor route.
  const isVaultRestoring = useAtomValue(atom_isVaultRestoring);
  const isVaultLocked = isVaultRestoring || isVaultPending;
  useActiveFileUrlSync({ isVaultLocked, openFile });

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

  // Mounted: the page shows from its first paint after hydration, with no
  // veil or fixed wait (a first visit lands straight in the editor).
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounting(false));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSave = useCallback(async () => {
    // A board's pending stroke goes into the store first; read from there.
    flushAllBoardWrites();
    const current = contentStore.get(atom_content);
    if (!current.trim()) return;

    if (activeFileHandle) {
      await saveFile(current);
    } else if (vaultHandle) {
      await materializeDraft();
    } else if (isVaultSupported || isBrowserVaultSupported) {
      // The first save with no vault asks where notes live.
      await chooseFolder();
    } else {
      await exportFile(current, fileName);
    }
  }, [activeFileHandle, vaultHandle, saveFile, exportFile, fileName, materializeDraft, isVaultSupported, isBrowserVaultSupported, chooseFolder]);

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
    activeTabPath: leaf.activeFilePath,
    closeTabWithAutosave,
    flush,
  });

  useEffect(() => {
    handleNewFileRef.current = handleNewFile;
  }, [handleNewFile]);

  // The sidebar's New note, from this page or from another route.
  const [newNoteRequested, setNewNoteRequested] = useAtom(atom_newNoteRequested);
  useEffect(() => {
    if (!newNoteRequested || isMounting || isVaultLocked) return;
    setNewNoteRequested(false);
    void handleNewFile();
  }, [newNoteRequested, isMounting, isVaultLocked, setNewNoteRequested, handleNewFile]);

  // The pane title's save indicator.
  const [saveRequested, setSaveRequested] = useAtom(atom_saveRequested);
  useEffect(() => {
    if (!saveRequested) return;
    setSaveRequested(false);
    void handleSaveRef.current();
  }, [saveRequested, setSaveRequested]);

  usePaletteCreateNote({ hasVault: !!vaultHandle, materializeDraft });


  // Export as Markdown: always a .md download of the note, vault note or
  // draft alike. It never saves; Save stays its own command.
  const handleExport = () => {
    const content = contentStore.get(atom_content);
    if (!content.trim()) return;
    downloadMarkdown(content, fileName);
    showSuccessToast("Download started");
  };

  return (
    <ErrorBoundary onGoHome={() => router.push("/")}>
      <AutoSave onDraftChange={handleDraftAutosave} flushRef={autoSaveFlushRef} />
      <EditorCommands
        onNewFile={handleNewFile}
        onExport={handleExport}
        onSave={() => handleSaveRef.current()}
        isMobileChrome={isMobileChrome}
        onOpenTasks={() => navigateWithGuard("/editor/tasks", "Tasks")}
        onOpenTemplates={() => navigateWithGuard("/editor/templates", "Templates")}
        onRefreshVault={handleRefreshVault}
        onImport={handleImport}
      />
      {/* On the feed, its skeleton (gate, then the main area) leads straight into it. */}
      <LoadingOverlay isVisible={!!navigatingLabel} text={`${navigatingLabel}...`} />
      {/* Switching files keeps the editor on screen; a slim bar (shown only if
          it takes >150ms) signals the read + re-render instead of a full veil. */}
      <LoadingBar isVisible={isFileLoading && !isMounting} label="Opening file" />
      <div
        className={`app-sheet fixed inset-y-0 flex flex-col bg-surface text-fg selection:bg-sage-light/30 font-sans overflow-hidden overscroll-none`}
        // Past the open sidebar, sliding with it (EditorShell); the whole
        // window on mobile.
        style={{
          left: "var(--content-left, 0px)",
          right: "var(--content-right, 0px)",
          transition: "left var(--layout-duration) var(--ease-layout), right var(--layout-duration) var(--ease-layout), background-color 500ms, color 500ms",
          ...visibleViewport,
        } as CSSProperties}
      >
        <h1 className="sr-only">HermesMarkdown Editor</h1>
        {/* Modals (the vault dialogs live in EditorShell, for every route) */}
        <ConflictDialog />
        {/* Before MermaidDialog, so its "Open viewer" stacks on top. */}
        <RenderedBlockSourceDialog />
        <MermaidDialog />
        <ImageDialog />
        <TokenCostDialog />
        <PdfExport />
        
        <DraftImportDialog pendingDraft={pendingDraft} onConfirm={confirmPendingDraft} onCancel={cancelPendingDraft} />

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".md,.txt,.markdown" className="hidden" />

        {/* --- MAIN LAYOUT --- */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Workspace Content */}
        <div className="flex-1 flex min-w-0 bg-surface overflow-hidden relative">
          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            {isMobileChrome && !isVaultLocked && (
              <MobileFileIndicator
                onSave={() => handleSaveRef.current()}
                onOpenAIChat={isAiConfigured ? openCompanion : undefined}
              />
            )}
            <div className="relative flex-1 min-h-0">
              <main
                className="h-full"
              >
                {isMounting || isVaultLocked ? (
                  <div className="animate-pulse opacity-10 space-y-6 pt-20 px-12 max-w-2xl mx-auto">
                    <div className="h-8 bg-current w-1/3 rounded-lg mb-16" />
                    <div className="h-4 bg-current w-full rounded-md" />
                    <div className="h-4 bg-current w-11/12 rounded-md" />
                    <div className="h-4 bg-current w-5/6 rounded-md" />
                  </div>
                ) : (
                  <PaneLeaf leaf={leaf} />
                )}
              </main>
            </div>
          </div>
        </div>
        </div>{/* end MAIN LAYOUT */}

        {!vaultHandle && !isMounting && !isVaultLocked && (
          <FolderPrompt
            onChooseFolder={() => void chooseFolder()}
            onDownload={handleExport}
            placement={isMobileChrome ? "top" : "bottom"}
          />
        )}

        <SelectionToolbar
          placement={isMobileChrome ? "docked" : "above"}
          onAsk={isAiConfigured ? openCompanion : undefined}
          onTransform={isAiConfigured ? () => openCompanion({
            prompt: "Rewrite the selected text for clarity. Use edit_file to propose the change for review; do not make any direct write.",
            autoSend: true,
          }) : undefined}
        />
      </div>
    </ErrorBoundary>
  );
}
