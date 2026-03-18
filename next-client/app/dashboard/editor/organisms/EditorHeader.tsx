"use client";

import Button from "@/app/components/Button";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { atom_pdfPreviewOpen } from "@/app/atoms/atoms";
import { FileMetadata } from "@/app/types/markdown";
import ExportService from "@/app/services/export-service";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import PDFPreviewDialog from "./PDFPreviewDialog";
import ShortcutsDialog from "./ShortcutsDialog";
import ActionsFAB from "./ActionsFAB";
import FindBar from "../molecules/FindBar";
import TitleFileInfo from "../molecules/TitleFileInfo";
import EditorForm from "./EditorForm";

interface Props {
  contentEdited: string;
  frontMatter: FileMetadata;
  onInsertTemplate: (template: string) => void;
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
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
  const isMobile = useIsMobile();
  const findInputRef = useRef<HTMLInputElement>(null);
  const [showFindBar, setShowFindBar] = useState(false);
  const fileTitle = frontMatter.title;
  const fileName = frontMatter.fileName;
  const hasTitle = fileTitle.length > 0;
  const safeFileName = fileName || "";
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useAtom(atom_pdfPreviewOpen);

  useEffect(() => {
    if (typeof window === "undefined") return;
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
      const isMac = navigator.userAgent.includes("Mac");
      if (
        (isMac && e.metaKey && e.key === "f") ||
        (!isMac && e.ctrlKey && e.key === "f")
      ) {
        e.preventDefault();
        setShowFindBar(true);
        setTimeout(() => findInputRef.current?.focus(), 0);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = contentEdited.match(regex);
    setMatchCount(matches ? matches.length : 0);
    setCurrentIndex(0);
  }, [searchTerm, contentEdited, setMatchCount, setCurrentIndex]);

  function handleNext() {
    if (matchCount === 0) return;
    const nextIndex: number = (currentIndex + 1) % matchCount;
    setCurrentIndex(nextIndex);
  }

  function handlePrev() {
    if (matchCount === 0) return;
    const prevIndex: number = (currentIndex - 1 + matchCount) % matchCount;
    setCurrentIndex(prevIndex);
  }

  function handleClear() {
    setSearchTerm("");
    setMatchCount(0);
    setCurrentIndex(0);
  }

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between w-full py-2 rounded-t-xl relative gap-4">
      <div className="flex flex-col items-start gap-1 w-full sm:max-w-md flex-shrink-0">
        {/* Font controls and Find bar with collapse toggle */}
        <ActionsFAB
          actions={actions}
          exportToMD={exportToMD}
        />
        
        <TitleFileInfo
          fileTitle={fileTitle}
          fileName={safeFileName}
          hasTitle={hasTitle}
          showFileDialog={showFileDialog}
        />
      
        <EditorForm
          isOpened={isFormatterDialogOpen}
          handleClose={() => setIsFormatterDialogOpen(false)}
        />
      </div>
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
      {/* Floating FindBar at bottom center */}
      {!isMobile && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 32,
            zIndex: 50,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{ pointerEvents: "auto" }}
            className={`transition-all duration-300 transform ${
              showFindBar
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            } pointer-events-auto`}
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
                onCollapse={() => {
                  handleClear();
                  setShowFindBar(false);
                }}
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
