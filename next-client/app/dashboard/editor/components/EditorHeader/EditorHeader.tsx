"use client";

import Button from "@/app/components/Button";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import EditorForm from "../EditorForm";
import { FileMetadata } from "@/app/types/markdown";
import { atom_content, atom_showTimer, atom_hasChanges, atom_fontFamily, atom_fontSize } from "@/app/atoms/atoms";
import DropdownMenu from "@/app/components/DropdownMenu";
import ExportService from "@/app/services/export-service";
import { FaFile, FaEdit, FaQuestion } from "react-icons/fa";
import { useRouter } from "next/navigation";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { showSuccessToast, showErrorToast, showCopyToast } from "@/app/components/Toastr";
import TitleFileInfo from "./TitleFileInfo";
import FontMenu from "./FontMenu";
import FontSizeMenu from "./FontSizeMenu";
import MobileMenu from "./MobileMenu";
import ActionsSidebar from "./ActionsSidebar";
import PDFPreviewDialog from "./PDFPreviewDialog";
import ShortcutsDialog from "./ShortcutsDialog";
import ActionsMobileMenu from "./ActionsMobileMenu";
import FindBar from "./FindBar";

interface Props {
  contentEdited: string;
  frontMatter: FileMetadata;
  hasChanges: boolean;
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleSelectTemplate: () => void;
    handleOpenFindAndReplace: () => void;
    handleOpenFontSettings: () => void;
    handleOpenTableEditor: () => void;
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
  actions,
  searchTerm,
  setSearchTerm,
  matchCount,
  setMatchCount,
  currentIndex,
  setCurrentIndex,
}: Props) {
  const [, setFileContent] = useAtom(atom_content);
  const [isFormatterDialogOpen, setIsFormatterDialogOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [showTimer, setShowTimer] = useAtom(atom_showTimer);
  const [, setHasChanges] = useAtom(atom_hasChanges);
  const router = useRouter();
  const isMobile = useIsMobile();
  const findInputRef = useRef<HTMLInputElement>(null);
  const [isFontControlsCollapsed, setIsFontControlsCollapsed] = useState(false);
  const [showFindBar, setShowFindBar] = useState(false);
  const fileTitle = frontMatter.title;
  const fileName = frontMatter.fileName;
  const hasTitle = fileTitle.length > 0;
  const safeFileName = fileName || "";
  const fabMenuRef = useRef<HTMLDivElement>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [, setFontFamily] = useAtom(atom_fontFamily);
  const [, setFontSize] = useAtom(atom_fontSize);
  const fontSizeOptions = [
    { value: "14px", label: "Small" },
    { value: "16px", label: "Normal" },
    { value: "18px", label: "Large" },
    { value: "20px", label: "Extra Large" },
  ];
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  const fontOptions = [
    { value: "Fira Mono, monospace", label: "Fira Mono" },
    { value: "JetBrains Mono, monospace", label: "JetBrains Mono" },
    { value: "Source Code Pro, monospace", label: "Source Code Pro" },
    { value: "Inconsolata, monospace", label: "Inconsolata" },
    { value: "Ubuntu Mono, monospace", label: "Ubuntu Mono" },
  ];

  // Higher-order function to wrap actions with closeFabMenu
  const withCloseFabMenu = (action: () => void) => () => {
    closeFabMenu();
    setTimeout(() => {
      action();
    }, 0);
  };

  // File menu options
  const fileMenuOptions = [
    {
      label: "New File...",
      action: withCloseFabMenu(actions.handleNewFile),
    },
    {
      label: "New from template...",
      action: withCloseFabMenu(actions.handleSelectTemplate),
    },
    {
      label: "Import File...",
      action: withCloseFabMenu(actions.handleOpenFile),
    },
    {
      label: "Save As...",
      action: withCloseFabMenu(exportToMD),
    },
  ];

  // Help menu options
  const helpMenuOptions = [
    {
      label: "Welcome",
      action: withCloseFabMenu(() => {
        router.push("/dashboard");
      }),
    },
    {
      label: "Documentation",
      action: withCloseFabMenu(() => router.push("/documentation")),
    },
  ];

  // Edit menu options
  const editMenuOptions = [
    {
      label: "Copy Markdown",
      action: withCloseFabMenu(() => {
        navigator.clipboard.writeText(contentEdited);
        showCopyToast("Markdown copied to clipboard");
      }),
    },
    {
      label: "Table Editor...",
      action: withCloseFabMenu(actions.handleOpenTableEditor),
    },
    {
      label: "Replace...",
      action: withCloseFabMenu(actions.handleOpenFindAndReplace),
    },
  ];

  // DropdownMenu controlled state
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [editMenuSelected, setEditMenuSelected] = useState<number | null>(null);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [helpMenuSelected, setHelpMenuSelected] = useState<number | null>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [fileMenuSelected, setFileMenuSelected] = useState<number | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fabMenuRef.current &&
        !fabMenuRef.current.contains(event.target as Node)
      ) {
        setIsFabMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
    <header className="flex flex-row items-center justify-between w-full py-4 rounded-t-xl relative">
      {/* Sidebar: Only show on desktop */}
      {!isMobile && (
        <ActionsSidebar
          actions={actions}
          contentEdited={contentEdited}
          exportToMD={exportToMD}
          showPdfPreviewModal={showPdfPreviewModal}
          setIsShortcutsOpen={setIsShortcutsOpen}
          showTimer={showTimer}
          setShowTimer={setShowTimer}
          onShowFindBar={() => setShowFindBar(true)}
          isFindBarOpen={showFindBar}
        />
      )}
      {/* Mobile: Use ActionsMobileMenu */}
      {isMobile && (
        <ActionsMobileMenu
          isOpen={isFabMenuOpen}
          onClose={() => setIsFabMenuOpen(false)}
          actions={actions}
          contentEdited={contentEdited}
          exportToMD={exportToMD}
          showPdfPreviewModal={showPdfPreviewModal}
          setIsShortcutsOpen={setIsShortcutsOpen}
          renderFileMenu={renderFileMenu}
          renderEditMenu={renderEditMenu}
          renderHelpMenu={renderHelpMenu}
        />
      )}
      {/* Left: Title and file info only */}
      <div className="flex flex-col items-start gap-1 max-w-md w-full flex-shrink-0">
        <TitleFileInfo
          fileTitle={fileTitle}
          fileName={safeFileName}
          hasTitle={hasTitle}
          hasChanges={hasChanges}
          showFileDialog={showFileDialog}
          renderFontMenu={() => null}
          renderFontSizeMenu={() => null}
        />
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
      {/* Center: (empty for now, can be used for future content) */}
      <div className="flex-1" />
      <MobileMenu
        isOpen={isFabMenuOpen}
        onClose={() => setIsFabMenuOpen(false)}
        actions={actions}
        contentEdited={contentEdited}
        exportToMD={exportToMD}
        fontOptions={fontOptions}
        fontSizeOptions={fontSizeOptions}
      />
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

  function closeFabMenu() {
    setIsFormatterDialogOpen(false);
    setIsFabMenuOpen(false);
  }

  function renderEditMenu() {
    return (
      <DropdownMenu
        options={editMenuOptions}
        label={<FaEdit />}
        isOpen={editMenuOpen}
        onOpenChange={setEditMenuOpen}
        selectedIndex={editMenuSelected}
        onSelect={setEditMenuSelected}
      />
    );
  }

  function renderHelpMenu() {
    return (
      <DropdownMenu
        options={helpMenuOptions}
        label={<FaQuestion />}
        isOpen={helpMenuOpen}
        onOpenChange={setHelpMenuOpen}
        selectedIndex={helpMenuSelected}
        onSelect={setHelpMenuSelected}
      />
    );
  }

  function renderFileMenu() {
    return (
      <DropdownMenu
        options={fileMenuOptions}
        label={<FaFile />}
        isOpen={fileMenuOpen}
        onOpenChange={setFileMenuOpen}
        selectedIndex={fileMenuSelected}
        onSelect={setFileMenuSelected}
      />
    );
  }

  function showFileDialog() {
    setIsFormatterDialogOpen(true);
  }

  async function exportToMD() {
    try {
      await ExportService.exportMarkdown(contentEdited, frontMatter);
      setFileContent(contentEdited);
      setHasChanges(false); // Clear unsaved changes after successful save
    } catch (error) {
      showErrorToast("File could not be saved");
      console.error(error);
    }
  }

  async function handlePdfExport() {
    const reportName = (frontMatter.fileName || "hermesnote").replace(".md", ".pdf");
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