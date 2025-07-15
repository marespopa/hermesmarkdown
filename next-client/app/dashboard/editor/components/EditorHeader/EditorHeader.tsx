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
import { FaClock, FaFile, FaEdit, FaQuestion, FaEye, FaColumns, FaPen, FaExclamationCircle, FaSave, FaCheck, FaKeyboard, FaFilePdf, FaMoon, FaSun, FaChevronDown, FaChevronUp, FaBars } from "react-icons/fa";
import { useRouter } from "next/navigation";
import useIsMobile from "@/app/hooks/use-is-mobile";
import ThemeToggle from "@/app/components/ThemeToggle";
import IconButton from "@/app/components/IconButton";
import React from "react";
import DialogModal from "@/app/components/DialogModal";
import Portal from "@/app/components/Portal";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import toast from "react-hot-toast";

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
}

export default function EditorHeader({
  contentEdited,
  frontMatter,
  hasChanges,
  actions,
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

  if (isCollapsed) {
    return (
      <div className="w-full flex flex-row items-center justify-between bg-white/80 dark:bg-gray-900/80 rounded-t-xl px-2 py-1 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-start gap-0 justify-start">
          <span className="text-xs text-gray-700 dark:text-gray-200 font-mono">{fileTitle}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{fileName?.endsWith(".md") ? fileName : fileName + ".md"}</span>
        </div>
        <button
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          onClick={() => setIsCollapsed(false)}
          title="Expand header"
          aria-label="Expand header"
        >
          <FaChevronDown />
        </button>
      </div>
    );
  }
  return (
    <header className="flex flex-col items-center justify-center w-full py-4 bg-white/80 dark:bg-gray-900/80 rounded-t-xl sm:flex-row sm:items-center sm:justify-between relative">
      <button
        className="absolute top-2 right-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={() => setIsCollapsed(true)}
        title="Collapse header (Zen mode)"
        aria-label="Collapse header"
      >
        <FaChevronUp />
      </button>
      {/* Left: Title and file info */}
      <div className="flex flex-col items-center gap-6 max-w-md w-full flex-shrink-0 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto">
          <div className="flex flex-row items-center gap-2 min-w-0 justify-center sm:justify-start sm:mt-2">
            <h1 className="truncate text-xl font-semibold text-gray-900 dark:text-white leading-tight text-center sm:text-left">{hasTitle && `${fileTitle}`}</h1>
            <span className="cursor-pointer" onClick={showFileDialog}>
              <PenIcon tooltip="File Settings" size={16} alt="Edit Title" />
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate text-center sm:text-left">{`${fileName?.endsWith(".md") ? fileName : fileName + ".md"}`}</span>
          <div className="mt-1 flex flex-col gap-1 items-center sm:items-start">
            <div className="flex flex-row gap-2 items-center justify-center">
              {renderFontMenu()}
              {renderFontSizeMenu()}
            </div>
            {/* Timer, theme, and menu controls aligned in a row */}
            <div className="flex flex-row items-center gap-3 mt-3 justify-center">
              <IconButton
                icon={<FaClock className="w-5 h-5" />}
                title={showTimer ? 'Hide timer' : 'Show timer'}
                onClick={() => setShowTimer(!showTimer)}
                dataTestId="timer-toggle"
              />
              <ThemeToggle />
              <IconButton
                icon={<FaBars className="w-5 h-5" />}
                title="Menu"
                onClick={() => setIsFabMenuOpen(true)}
                className="sm:hidden"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Right: Actions */}
      <div className="flex flex-row items-center gap-2 justify-center w-full sm:w-auto sm:justify-end mt-2 sm:mt-0">
        {isFabMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-900 bg-opacity-95 dark:bg-opacity-95">
            <button
              onClick={() => setIsFabMenuOpen(false)}
              className="absolute top-4 right-4 text-3xl text-gray-700 dark:text-gray-300 focus:outline-none"
              aria-label="Close Menu"
            >
              &times;
            </button>
            <div className="flex flex-col gap-3 max-w-xs mx-auto px-4 mt-8 mb-4 overflow-y-auto max-h-[80vh] items-stretch">
              {renderMobileFontMenu()}
              {renderMobileFontSizeMenu()}
              <div className="mb-6" />
              <div className="flex flex-col gap-3 w-full items-center">
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors max-w-xs"
                  onClick={withCloseFabMenu(actions.handleNewFile)}
                >
                  New File
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
                  onClick={withCloseFabMenu(actions.handleSelectTemplate)}
                >
                  Template
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors max-w-xs"
                  onClick={withCloseFabMenu(exportToMD)}
                >
                  Save File
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors max-w-xs"
                  onClick={withCloseFabMenu(actions.handleOpenFile)}
                >
                  Open File
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors max-w-xs"
                  onClick={withCloseFabMenu(() => navigator.clipboard.writeText(contentEdited))}
                >
                  Copy Markdown
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors max-w-xs"
                  onClick={withCloseFabMenu(actions.handleOpenFindAndReplace)}
                >
                  Find/Replace
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors max-w-xs"
                  onClick={withCloseFabMenu(() => setTheme(theme === "light" ? "dark" : "light"))}
                >
                  {theme === "light" ? "Dark Mode" : "Light Mode"}
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors max-w-xs"
                  onClick={withCloseFabMenu(() => router.push('/documentation'))}
                >
                  Documentation
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Icon buttons and dropdowns for tablet and up */}
        <IconButton
          icon={<FaFile />}
          title="New File"
          aria-label="New File"
          onClick={() => actions.handleNewFile()}
          className="hidden sm:inline-flex"
        />
        {renderFileMenu()}
        <IconButton
          icon={<FaSave />}
          title="Save As"
          onClick={exportToMD}
          className="hidden sm:inline-flex"
        />
        <IconButton
          icon={<FaFilePdf />}
          title="Export to PDF"
          onClick={showPdfPreviewModal}
          dataTestId="export-pdf"
          className="hidden sm:inline-flex"
        />
        {renderEditMenu()}
        {renderHelpMenu()}
        <IconButton
          icon={<FaKeyboard />}
          title="Keyboard Shortcuts"
          onClick={() => setIsShortcutsOpen(true)}
          className="hidden sm:inline-flex"
        />
      </div>
      <Portal>
        <EditorForm
          isOpened={isFormatterDialogOpen}
          handleClose={() => setIsFormatterDialogOpen(false)}
        />
        <DialogModal
          isOpened={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        >
          <div className="p-4 max-w-lg">
            <h2 className="text-xl font-bold mb-4">Keyboard Shortcuts</h2>
            <ul className="font-mono text-base space-y-2">
              <li><b>⌘/Ctrl + S</b>: Save</li>
              <li><b>⌘/Ctrl + O</b>: Open File</li>
              <li><b>⌘/Ctrl + N</b>: New File</li>
              <li><b>⌘/Ctrl + F</b>: Find/Replace</li>
              <li><b>⌘/Ctrl + Z</b>: Undo</li>
              <li><b>⌘/Ctrl + Shift + Z</b>: Redo</li>
              <li><b>⌘/Ctrl + P</b>: Command Palette</li>
              <li><b>⌘/Ctrl + B</b>: Toggle Sidebar</li>
              <li><b>Esc</b>: Close Dialogs</li>
            </ul>
          </div>
        </DialogModal>
      </Portal>
      <Portal>
        <DialogModal
          isOpened={isPdfPreviewOpen}
          onClose={() => hidePdfPreviewModal()}
        >
          <div className="h-full relative">
            {/* Top bar: Export button (left), Font selector (center), Close (right) */}
            <div className="flex items-center justify-between mb-6">
              <Button
                styles="animate-pop flex-initial"
                variant="primary"
                label="Export"
                handler={() => handlePdfExport()}
              />
              <div className="flex-1 flex justify-center">
                {!hideFontDropdown && (
                  <select
                    id="pdf-font-select"
                    value={selectedFont}
                    onChange={e => setSelectedFont(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow"
                  >
                    <option value="font-sans">Sans-serif</option>
                    <option value="font-serif">Serif</option>
                    <option value="font-mono">Monospace</option>
                  </select>
                )}
              </div>
              {/* The close button is handled by DialogModal itself */}
            </div>
            <div className="mb-4 text-xs text-gray-600 dark:text-gray-400 font-mono">
              <strong>PDF Export Disclaimer:</strong> For best readability, exported PDFs always use a white background, even in dark mode.
            </div>
            <div id="pdfReport">
              <section>
                <PdfMarkdownPreview content={contentEdited} fontClass={selectedFont} />
              </section>
            </div>
          </div>
        </DialogModal>
      </Portal>
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
        trigger={
          <IconButton
            icon={<FaEdit />}
            title="Edit"
            showDropdownIndicator={true}
            className="hidden sm:inline-flex"
          />
        }
      />
    );
  }

  function renderHelpMenu() {
    return (
      <DropdownMenu
        options={helpMenuOptions}
        trigger={
          <IconButton
            icon={<FaQuestion />}
            title="Help"
            showDropdownIndicator={true}
            className="hidden sm:inline-flex"
          />
        }
      />
    );
  }

  function renderFileMenu() {
    return (
      <DropdownMenu
        options={fileMenuOptions}
        trigger={
          <IconButton
            icon={<FaFile />}
            title="File"
            showDropdownIndicator={true}
            className="hidden sm:inline-flex"
          />
        }
      />
    );
  }

  function renderFontMenu() {
    const fontMenuOptions = fontOptions.map(option => ({
      label: option.label,
      action: () => setFontFamily(option.value)
    }));

    return (
      <DropdownMenu
        options={fontMenuOptions}
        trigger={
          <button className="border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-base px-3 py-2 hover:bg-black hover:text-white transition-colors flex items-center gap-2">
            Font <FaChevronDown className="ml-2 w-4 h-4" />
          </button>
        }
      />
    );
  }

  function renderFontSizeMenu() {
    const fontSizeMenuOptions = fontSizeOptions.map(option => ({
      label: option.label,
      action: () => setFontSize(option.value)
    }));

    return (
      <DropdownMenu
        options={fontSizeMenuOptions}
        trigger={
          <button className="border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-base px-3 py-2 hover:bg-black hover:text-white transition-colors flex items-center gap-2">
            Size <FaChevronDown className="ml-2 w-4 h-4" />
          </button>
        }
      />
    );
  }

  function renderMobileFontMenu() {
    const fontMenuOptions = fontOptions.map(option => ({
      label: option.label,
      action: () => setFontFamily(option.value)
    }));

    return (
      <DropdownMenu
        options={fontMenuOptions}
        trigger={
          <button className="w-full py-3 px-4 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors max-w-xs">
            Font: {fontOptions.find(opt => opt.value === fontFamily)?.label || 'Inter'}
          </button>
        }
      />
    );
  }

  function renderMobileFontSizeMenu() {
    const fontSizeMenuOptions = fontSizeOptions.map(option => ({
      label: option.label,
      action: () => setFontSize(option.value)
    }));

    return (
      <DropdownMenu
        options={fontSizeMenuOptions}
        trigger={
          <button className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors max-w-xs">
            Size: {fontSizeOptions.find(opt => opt.value === fontSize)?.label || 'Normal'}
          </button>
        }
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

const PanelControls = ({ panelState, setPanelState }: { panelState: string; setPanelState: (state: any) => void }) => (
  <div className="flex justify-center gap-2 w-full mt-2 mb-2 rounded-none p-1 bg-transparent">
    <ToggleButton
      icon={<FaPen />}
      title="Editor Only"
      isActive={panelState === "editor"}
      onClick={() => setPanelState("editor")}
    />
    <ToggleButton
      icon={<FaEye />}
      title="Preview Only"
      isActive={panelState === "preview"}
      onClick={() => setPanelState("preview")}
    />
    <ToggleButton
      icon={<FaColumns />}
      title="Split View (Editor + Preview)"
      isActive={panelState === "both"}
      onClick={() => setPanelState("both")}
    />
  </div>
);

const ToggleButton = ({
  icon,
  title,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    aria-pressed={isActive}
    className={`px-2 py-2 min-w-[44px] h-10 border border-black rounded-none bg-white text-black font-mono font-bold flex items-center justify-center relative hover:bg-black hover:text-white transition-colors duration-150`}
    data-testid={
      title === "Editor Only"
        ? "toggle-editor"
        : title === "Preview Only"
        ? "toggle-preview"
        : title === "Split View (Editor + Preview)"
        ? "toggle-split"
        : undefined
    }
  >
    <span className="flex items-center justify-center h-5 w-5">
      {icon}
    </span>
    {isActive && (
      <span style={{ position: 'absolute', top: 2, right: 2 }}>
        <FaCheck className="w-3 h-3 text-emerald-500" />
      </span>
    )}
  </button>
);

export { PanelControls };