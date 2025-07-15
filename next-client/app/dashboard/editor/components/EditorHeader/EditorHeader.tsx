"use client";

import Button from "@/app/components/Button";
import { useAtom } from "jotai";
import EditorPreviewTrigger from "../EditorPreviewTrigger";
import PenIcon from "@/app/components/Icons/PenIcon";
import { useEffect, useRef, useState } from "react";
import EditorForm from "../EditorForm";
import { FileMetadata } from "@/app/types/markdown";
import { atom_content, atom_showTimer, atom_panelState, atom_hasChanges, atom_theme, atom_fontFamily, atom_fontSize } from "@/app/atoms/atoms";
import DropdownMenu from "@/app/components/DropdownMenu";
import ExportService from "@/app/services/export-service";
import { FaClock, FaFile, FaEdit, FaQuestion, FaEye, FaColumns, FaPen, FaExclamationCircle, FaSave, FaCheck, FaKeyboard, FaFilePdf, FaMoon, FaSun, FaChevronDown, FaChevronUp, FaBars, FaTimes } from "react-icons/fa";
import { useRouter } from "next/navigation";
import useIsMobile from "@/app/hooks/use-is-mobile";
import React from "react";
import DialogModal from "@/app/components/DialogModal";
import Portal from "@/app/components/Portal";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import toast from "react-hot-toast";
import TitleFileInfo from "./TitleFileInfo";
import FontMenu from "./FontMenu";
import FontSizeMenu from "./FontSizeMenu";
import MobileMenu from "./MobileMenu";
import ActionsSidebar from "./ActionsSidebar";
import PDFPreviewDialog from "./PDFPreviewDialog";
import ShortcutsDialog from "./ShortcutsDialog";
import ActionsMobileMenu from "./ActionsMobileMenu";

interface Props {
  contentEdited: string;
  frontMatter: FileMetadata;
  hasChanges: boolean;
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleSelectTemplate: () => void;
    handleOpenFindAndReplace: () => void;
  };
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function EditorHeader({
  contentEdited,
  frontMatter,
  hasChanges,
  actions,
  collapsed,
  setCollapsed,
}: Props) {
  const [, setFileContent] = useAtom(atom_content);
  const [isFormatterDialogOpen, setIsFormatterDialogOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [showTimer, setShowTimer] = useAtom(atom_showTimer);
  const [panelState, setPanelState] = useAtom(atom_panelState);
  const [, setHasChanges] = useAtom(atom_hasChanges);
  const router = useRouter();
  const isMobile = useIsMobile();
  const fileTitle = frontMatter.title;
  const fileName = frontMatter.fileName;
  const hasTitle = fileTitle.length > 0;
  // Helper to adapt jotai setTheme to (theme: string) => void
  const setThemeString = (theme: string) => setTheme(theme as "light" | "dark");
  const safeFileName = fileName || "";
  const fabMenuRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useAtom(atom_theme);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const fontSizeOptions = [
    { value: "14px", label: "Small" },
    { value: "16px", label: "Normal" },
    { value: "18px", label: "Large" },
    { value: "20px", label: "Extra Large" },
  ];
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>("font-sans");
  const [hideFontDropdown, setHideFontDropdown] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      label: "Open File...",
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
      action: withCloseFabMenu(() =>
        navigator.clipboard.writeText(contentEdited)
      ),
    },
    {
      label: "Find/Replace...",
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
          collapsed={collapsed}
          setCollapsed={setCollapsed}
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
          renderFontMenu={() => !isMobile && (
            <FontMenu fontOptions={fontOptions} setFontFamily={setFontFamily} />
          )}
          renderFontSizeMenu={() => !isMobile && (
            <FontSizeMenu fontSizeOptions={fontSizeOptions} setFontSize={setFontSize} />
          )}
        />
        {isMobile && (
          <Button
            variant="secondary"
            styles="w-full mt-2"
            onClick={() => setIsFabMenuOpen(true)}
          >
            Settings
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
        selectedFont={selectedFont}
        setSelectedFont={setSelectedFont}
        hideFontDropdown={hideFontDropdown}
        setHideFontDropdown={setHideFontDropdown}
        handlePdfExport={handlePdfExport}
      />
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

  function exportToMD() {
    ExportService.exportMarkdown(contentEdited, frontMatter);
    setFileContent(contentEdited);
    setHasChanges(false); // Clear unsaved changes after save
  }

  async function handlePdfExport() {
    const reportName = (frontMatter.fileName || "hermesnote").replace(".md", ".pdf");
    setHideFontDropdown(true);
    await new Promise((resolve) => setTimeout(resolve, 100)); // allow DOM to update
    try {
      await ExportService.generatePDF("#pdfReport", reportName);
      toast.success("File has been exported");
      setHideFontDropdown(false);
    } catch (error) {
      toast.error("File could not be exported");
      console.error(error);
      setHideFontDropdown(false);
    }
  }

  function showPdfPreviewModal() {
    setIsPdfPreviewOpen(true);
  }

  function hidePdfPreviewModal() {
    setIsPdfPreviewOpen(false);
  }

  // PDF-specific markdown preview that forces light mode
  function PdfMarkdownPreview({ content, fontClass = "font-sans" }: { content: string, fontClass?: string }) {
    if (!content?.length) {
      return (
        <div data-testid="preview">
          <p className="text-gray-700">The file is currently empty...</p>
        </div>
      );
    }
    return (
      <div data-testid="preview" className={`bg-white prose ${fontClass}`} style={{ color: '#222' }}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            code(props) {
              const { children, className, node, ...rest } = props;
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                <SyntaxHighlighter style={docco} PreTag="div" language={match[1]}>
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code {...rest} className={className}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </Markdown>
      </div>
    );
  }
}