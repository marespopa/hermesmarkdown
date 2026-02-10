"use client";

import Button from "@/app/components/Button";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import EditorForm from "./EditorForm";
import { FileMetadata } from "@/app/types/markdown";
import { atom_hasChanges } from "@/app/atoms/atoms";
import ExportService from "@/app/services/export-service";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import TitleFileInfo from "../molecules/TitleFileInfo";
import ActionsSidebar from "./ActionsSidebar";
import PDFPreviewDialog from "./PDFPreviewDialog";
import ShortcutsDialog from "./ShortcutsDialog";
import ActionsMobileMenu from "./ActionsMobileMenu";
import FindBar from "../molecules/FindBar";
import PromptCommandBar from "./PromptCommandBar";

interface Props {
  contentEdited: string;
  frontMatter: FileMetadata;
  hasChanges: boolean;
  onInsertTemplate: (template: string) => void;
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleSelectTemplate: () => void;
    handleOpenFindAndReplace: () => void;
    handleCopyPrompt: () => void;
  };
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  matchCount: number;
  setMatchCount: (count: number) => void;
  currentIndex: number;
  setCurrentIndex: (idx: number) => void;
}

export default function EditorHeader({
  contentEdited,
  frontMatter,
  hasChanges,
  onInsertTemplate,
  actions,
  searchTerm,
  setSearchTerm,
  matchCount,
  setMatchCount,
  currentIndex,
  setCurrentIndex,
}: Props) {
  const [isFormatterDialogOpen, setIsFormatterDialogOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [, setHasChanges] = useAtom(atom_hasChanges);
  const isMobile = useIsMobile();
  const findInputRef = useRef<HTMLInputElement>(null);
  const [showFindBar, setShowFindBar] = useState(false);
  const fileTitle = frontMatter.title;
  const fileName = frontMatter.fileName;
  const hasTitle = fileTitle.length > 0;
  const safeFileName = fileName || "";
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const openPdfPreview = window.localStorage.getItem("hm_open_pdf_preview");
    if (openPdfPreview) {
      setIsPdfPreviewOpen(true);
      window.localStorage.removeItem("hm_open_pdf_preview");
    }

    const openShortcuts = window.localStorage.getItem("hm_open_shortcuts");
    if (openShortcuts) {
      setIsShortcutsOpen(true);
      window.localStorage.removeItem("hm_open_shortcuts");
    }
  }, []);


  // Keyboard shortcut: Cmd/Ctrl+F opens FindBar
  useEffect(() => {
    if (isMobile) return;
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.userAgent.includes('Mac');
      if (
        (isMac && e.metaKey && e.key === 'f') ||
        (!isMac && e.ctrlKey && e.key === 'f')
      ) {
        e.preventDefault();
        setShowFindBar(true);
        setTimeout(() => findInputRef.current?.focus(), 0);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

  // Show FindBar if searchTerm is set
  useEffect(() => {
    if (searchTerm) setShowFindBar(true);
  }, [searchTerm]);

  // Focus FindBar input when shown
  useEffect(() => {
    if (showFindBar) {
      findInputRef.current?.focus();
    }
  }, [showFindBar]);

  // Find logic
  useEffect(() => {
    if (!searchTerm) {
      setMatchCount(0);
      setCurrentIndex(0);
      return;
    }
    // Find all matches in contentEdited
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const matches = [...contentEdited.matchAll(regex)];
    setMatchCount(matches.length);
    if (matches.length === 0) setCurrentIndex(0);
    else if (currentIndex >= matches.length) setCurrentIndex(0);
  }, [searchTerm, contentEdited, currentIndex, setCurrentIndex, setMatchCount]);

  const handleNext = () => {
    if (matchCount === 0) return;
    setCurrentIndex((currentIndex + 1) % matchCount);
  };
  const handlePrev = () => {
    if (matchCount === 0) return;
    setCurrentIndex((currentIndex - 1 + matchCount) % matchCount);
  };
  const handleClear = () => {
    setSearchTerm("");
    setMatchCount(0);
    setCurrentIndex(0);
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between w-full py-4 rounded-t-xl relative gap-4">
      {/* Sidebar: Only show on desktop */}
      {!isMobile && (
        <ActionsSidebar
          actions={actions}
          exportToMD={exportToMD}
          onShowFindBar={() => setShowFindBar(true)}
        />
      )}
      {/* Mobile: Use ActionsMobileMenu */}
      {isMobile && (
        <ActionsMobileMenu
          isOpen={isFabMenuOpen}
          onClose={() => setIsFabMenuOpen(false)}
          actions={actions}
          exportToMD={exportToMD}
        />
      )}
      {/* Left: Title and file info only */}
      <div className="flex flex-col items-start gap-1 w-full sm:max-w-md flex-shrink-0">
        <TitleFileInfo
          fileTitle={fileTitle}
          fileName={safeFileName}
          hasTitle={hasTitle}
          hasChanges={hasChanges}
          showFileDialog={showFileDialog}
          renderFontMenu={() => null}
          renderFontSizeMenu={() => null}
        />
        {isMobile && (
          <div className="w-full mt-3">
            <PromptCommandBar
              contentEdited={contentEdited}
              onInsertTemplate={onInsertTemplate}
              isCompact
            />
          </div>
        )}
        {/* Font controls and Find bar with collapse toggle */}
        {/* Only show FindBar if needed, no font controls or collapse button */}
        {/* FindBar and show/hide button removed, now handled in ActionsSidebar */}
        {isMobile && (
          <Button
            variant="secondary"
            styles="w-full mt-2"
            onClick={() => setIsFabMenuOpen(true)}
          >
            Menu
          </Button>
        )}
      </div>
      {/* Center: Helper text */}
      {!isMobile && (
        <div className="flex-1 flex justify-end">
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            Press / to see commands.
          </div>
        </div>
      )}
      <ShortcutsDialog
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <PDFPreviewDialog
        isOpen={isPdfPreviewOpen}
        onClose={hidePdfPreviewModal}
        contentEdited={contentEdited}
        handlePdfExport={handlePdfExport}
      />
      <EditorForm
        isOpened={isFormatterDialogOpen}
        handleClose={() => setIsFormatterDialogOpen(false)}
      />
      {/* Floating FindBar at bottom center */}
      {!isMobile && (
        <div
          style={{ position: "fixed", left: 0, right: 0, bottom: 32, zIndex: 50, display: "flex", justifyContent: "center", pointerEvents: "none" }}
        >
          <div
            style={{ pointerEvents: "auto" }}
            className={`transition-all duration-300 transform ${showFindBar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} pointer-events-auto`}
          >
            {showFindBar && (
              <FindBar
                ref={findInputRef}
                searchTerm={searchTerm}
                matchCount={matchCount}
                currentIndex={currentIndex}
                onSearch={setSearchTerm}
                onNext={handleNext}
                onPrev={handlePrev}
                onClear={handleClear}
                onCollapse={() => setShowFindBar(false)}
              />
            )}
          </div>
        </div>
      )}
    </header>
  );

  function showFileDialog() {
    setIsFormatterDialogOpen(true);
  }

  async function exportToMD() {
    try {
      await ExportService.exportMarkdown(contentEdited, frontMatter);
      setHasChanges(false); // Clear unsaved changes after successful export
    } catch (error) {
      showErrorToast("File could not be exported");
      console.error(error);
    }
  }

  async function handlePdfExport() {
    const reportName = (frontMatter.fileName || "file").replace(".md", ".pdf");
    await new Promise((resolve) => setTimeout(resolve, 100)); // allow DOM to update
    try {
      await ExportService.generatePDF("#pdfReport", reportName);
      showSuccessToast("File has been exported");
    } catch (error) {
      showErrorToast("File could not be exported");
      console.error(error);
    }
  }

  function showPdfPreviewModal() {
    setIsPdfPreviewOpen(true);
  }

  function hidePdfPreviewModal() {
    setIsPdfPreviewOpen(false);
  }
}