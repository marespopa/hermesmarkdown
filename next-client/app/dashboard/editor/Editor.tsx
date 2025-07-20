"use client";

import EditorHeader from "./components/EditorHeader";
import EditorContent from "./components/EditorContent";
import Timer from "@/app/components/Timer";
import { useAtom } from "jotai";
import {
  atom_content,
  atom_contentEdited,
  atom_frontMatter,
  atom_hasChanges,
  atom_showTimer,
  atom_timerSettings,
  atom_fontFamily,
  atom_fontSize,
  atom_sidebarCollapsed,
  atom_pomodoroPosition,
} from "@/app/atoms/atoms";
import { useDocumentTitle } from "@/app/hooks/use-document-title";
import { useState, useEffect } from "react";
import { PICKER_OPTIONS } from "./components/EditorEmpty";
import { StatusResponse } from "@/app/services/save-utils";
import matter from "gray-matter";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import TemplateSelectionModal from "../templates/TemplateSelectionModal";
import { useCommand } from "@/app/hooks/use-command";
import FileSelectionModal from "../components/FileSelectionModal";
import FindAndReplaceModal from "../components/FindAndReplaceModal";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { EMPTY_PAGE_TEMPLATE } from "./EditorUtils";
import { useRouter } from "next/navigation";
import FontConfigDialog from "./components/EditorHeader/FontConfigDialog";
import { useRef } from "react";
import { FaExpand, FaTimes } from "react-icons/fa";
import Button from "@/app/components/Button";
import ExportService from "@/app/services/export-service";
import TableEditorModal from "./components/TableEditorModal";

export default function Editor() {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsed] = useAtom(atom_sidebarCollapsed);
  const [isTimerVisible, setShowTimer] = useAtom(atom_showTimer);
  const [frontMatter] = useAtom(atom_frontMatter);
  const fileTitle = frontMatter.title || "File";
  const fileName = frontMatter.fileName || fileTitle || "File";
  const [contentEdited, setContentEdited] = useAtom(atom_contentEdited);
  const [, setFrontMatter] = useAtom(atom_frontMatter);
  const [, setContent] = useAtom(atom_content);
  const [hasChanges] = useAtom(atom_hasChanges);
  const [, setHasChanges] = useAtom(atom_hasChanges);
  const isMobile = useIsMobile();
  const [isFindAndReplaceModalVisible, setIsFindAndReplaceModalVisible] =
    useState(false);
  const [isFileSelectModalVisible, setIsFileSelectModalVisible] =
    useState(false);
  const [isTemplateSelectModalVisible, setIsTemplateSelectModalVisible] =
    useState(false);
  const [isTableEditorModalVisible, setIsTableEditorModalVisible] =
    useState(false);
  const router = useRouter();
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [isFontDialogOpen, setIsFontDialogOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const zenButtonRef = useRef<HTMLButtonElement>(null);

  // Search functionality
  // Remove useSearch import and all useCommand calls for find, findNext, findPrevious
  // Only keep Replace modal logic

  // Find bar state (move to Editor, pass to header and editor)
  const [searchTerm, setSearchTerm] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [_, setDocumentTitle] = useDocumentTitle("Hermes Markdown");

  useCommand("export", () => exportToMD());
  useCommand("open", () => handleOpenFile());
  useCommand("new", () => handleNewFile());
  useCommand("template", () => handleSelectTemplate());
  useCommand("table", () => handleOpenTableEditor());
  useCommand("home", () => router.push("/dashboard"));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDocumentTitle(fileTitle);
  }, [fileTitle, setDocumentTitle]);

  useEffect(() => {
    // Dynamically load Google Fonts if selected
    const googleFonts: Record<string, string> = {
      "Fira Mono, monospace": "Fira+Mono",
      "JetBrains Mono, monospace": "JetBrains+Mono",
      "Source Code Pro, monospace": "Source+Code+Pro",
      "Inconsolata, monospace": "Inconsolata",
      "Ubuntu Mono, monospace": "Ubuntu+Mono",
    };
    const fontKey = Object.keys(googleFonts).find(key => fontFamily.startsWith(key.split(",")[0]));
    if (fontKey) {
      const fontName = googleFonts[fontKey];
      const id = `google-font-${fontName}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css?family=${fontName}:400,700&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [fontFamily]);

  // Exit Zen Mode on Esc
  useEffect(() => {
    if (!isZenMode) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsZenMode(false);
        zenButtonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZenMode]);

  function handleNewFile() {
    setIsLoading(true);
    setFrontMatter({
      fileName: "file",
      title: "File",
      description: "",
      tags: "",
    });
    setContent(EMPTY_PAGE_TEMPLATE);
    setContentEdited(EMPTY_PAGE_TEMPLATE);
    setHasChanges(false); // Clear unsaved changes
    setIsLoading(false);
  }

  async function handleOpenFile() {
    if (isMobile) {
      setIsFileSelectModalVisible(true);
      return;
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker(PICKER_OPTIONS);
      const file = await fileHandle.getFile();

      setIsLoading(true);
      await parseFile(file);
    } catch (error) {
      // Don't log or treat as error if user cancelled the file picker
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Error opening file:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function parseFile(file: File): Promise<StatusResponse> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        const result = await loadFileData(reader, file.name);
        resolve(result);
      };

      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function loadFileData(reader: FileReader, fileName: string) {
    const fileContent = String(reader.result);
    const { data: frontMatter, content } = matter(fileContent);

    let setterPromise = new Promise<StatusResponse>(function (resolve, reject) {
      try {
        setFrontMatter({
          fileName: fileName || "",
          title: frontMatter?.title || "",
          description: frontMatter?.description || "",
          tags: frontMatter?.tags ? frontMatter?.tags.join(",") : "",
        });
        setContent(content);
        setContentEdited(content);
        setHasChanges(false); // Clear unsaved changes after loading file
        resolve({
          status: "error",
          message: "File has been loaded successfully",
        });
      } catch (error) {
        reject({
          status: "error",
          message: error,
        });
      }
    });

    return setterPromise;
  }

  function handleOpenFindAndReplace() {
    setIsFindAndReplaceModalVisible(true);
  }

  function handleSelectTemplate() {
    setIsTemplateSelectModalVisible(true);
  }

  function handleOpenTableEditor() {
    setIsTableEditorModalVisible(true);
  }

  function handleCloseTimer() {
    setShowTimer(false);
  }

  function handleOpenFontSettings() {
    setIsFontDialogOpen(true);
  }

  function handleSaveFontSettings(fontFamily: string, fontSize: string) {
    setFontFamily(fontFamily);
    setFontSize(fontSize);
  }

  function handleInsertTable(markdownTable: string) {
    // Insert the table at the current cursor position or at the end
    const newContent = contentEdited + '\n\n' + markdownTable + '\n\n';
    setContentEdited(newContent);
    setHasChanges(true);
  }

  function handleReplaceTable(oldTable: string, newTable: string) {
    // Replace the existing table with the new one
    const newContent = contentEdited.replace(oldTable, newTable);
    setContentEdited(newContent);
    setHasChanges(true);
  }

  async function exportToMD() {
    try {
      await ExportService.exportMarkdown(contentEdited, frontMatter);
      setContent(contentEdited);
      setHasChanges(false); // Clear unsaved changes after successful export
    } catch (error) {
      console.error(error);
    }
  }

  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return <LoadingOverlay isVisible={true} text="Loading..." />;
  }

  // Determine left margin for main content
  const isMobileView = isMobile;
  const sidebarMargin = isMobileView ? "" : (collapsed ? "ml-16" : "ml-56");

  return (
    <div className="w-full h-screen bg-amber-100 dark:bg-darkbg">
      {/* Zen Mode Dedicated Overlay & Centered Editor */}
      {isZenMode && (
        <>
          {/* Dedicated overlay for dimming/blurring, does not affect layout or pointer events of sidebar/main content */}
          <div className="fixed inset-0 z-40 bg-black/40 dark:bg-white/10 backdrop-blur-md transition-all duration-300" />
          {/* Centered Editor Container (remains interactive) */}
          <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen w-screen pointer-events-none">
            <div className="relative flex flex-col w-full max-w-[95vw] mx-auto min-h-[70vh] max-h-[96vh] overflow-y-auto scrollbar-thin rounded-xl transition-all duration-300 p-0 sm:p-4 pointer-events-auto">
              {/* Floating Close Button */}
              <Button
                ref={zenButtonRef} 
                variant="icon"
                aria-label="Exit Zen Mode"
                onClick={() => setIsZenMode(false)}
                styles="z-50 absolute right-12 top-4 sm:right-20 sm:top-8"
              >
                <FaTimes className="w-6 h-6" />
              </Button>
              {/* Editor Content */}
              <EditorContent
                contentEdited={contentEdited}
                setContentEdited={setContentEdited}
                setHasChanges={setHasChanges}
                fontFamily={fontFamily}
                fontSize={fontSize}
                searchTerm={searchTerm}
                matchCount={matchCount}
                currentIndex={currentIndex}
                zenMode={true}
              />
            </div>
          </div>
        </>
      )}
      {/* Sidebar and Main Content (no blur/pointer-events in Zen Mode) */}
      <div className={`flex-1 min-h-screen overflow-auto px-8 ${sidebarMargin} transition-all duration-300`}>
        {/* Pomodoro Timer: floating on right for desktop, inline for mobile */}
        {!isMobile && isTimerVisible && (
          <div
            className="fixed bottom-8 right-8 z-50"
          >
            <Timer fileName={fileTitle} onClose={() => setShowTimer(false)} />
          </div>
        )}
        {/* Zen Mode Toggle Button: only show on desktop */}
        {!isMobile && !isZenMode && (
          <Button
            ref={zenButtonRef}
            variant="icon"
            aria-label="Enter Zen Mode"
            title="Enter Zen Mode"
            onClick={() => setIsZenMode(true)}
            styles="absolute right-4 top-4 z-40 focus:ring-2 focus:ring-amber-400 hover:bg-opacity-80"
          >
            <FaExpand className="w-6 h-6" />
          </Button>
        )}
        {/* On mobile, show timer inline if visible */}
        {isMobile && isTimerVisible && (
          <div className="mb-4">
            <Timer />
          </div>
        )}
        <EditorHeader
          contentEdited={contentEdited}
          frontMatter={frontMatter}
          hasChanges={hasChanges}
          actions={{
            handleNewFile,
            handleOpenFile,
            handleSelectTemplate,
            handleOpenFindAndReplace,
            handleOpenFontSettings,
            handleOpenTableEditor,
          }}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          matchCount={matchCount}
          setMatchCount={setMatchCount}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
        />
        <FontConfigDialog
          isOpen={isFontDialogOpen}
          onClose={() => setIsFontDialogOpen(false)}
          onSave={handleSaveFontSettings}
          initialFontFamily={fontFamily}
          initialFontSize={fontSize}
        />
        <EditorContent
          contentEdited={contentEdited}
          setContentEdited={setContentEdited}
          setHasChanges={setHasChanges}
          fontFamily={fontFamily}
          fontSize={fontSize}
          searchTerm={searchTerm}
          matchCount={matchCount}
          currentIndex={currentIndex}
        />
        {/* Template Selection Modal */}
        {isTemplateSelectModalVisible && (
          <TemplateSelectionModal
            isOpen={isTemplateSelectModalVisible}
            handleClose={() => setIsTemplateSelectModalVisible(false)}
          />
        )}
        {/* File Selection Modal */}
        {isFileSelectModalVisible && (
          <FileSelectionModal
            isOpen={isFileSelectModalVisible}
            handleClose={() => setIsFileSelectModalVisible(false)}
          />
        )}
        {/* Find and Replace Modal */}
        {isFindAndReplaceModalVisible && (
          <FindAndReplaceModal
            isOpen={isFindAndReplaceModalVisible}
            handleClose={() => setIsFindAndReplaceModalVisible(false)}
          />
        )}
        {/* Table Editor Modal */}
        {isTableEditorModalVisible && (
          <TableEditorModal
            isOpen={isTableEditorModalVisible}
            onClose={() => setIsTableEditorModalVisible(false)}
            onInsertTable={handleInsertTable}
            onReplaceTable={handleReplaceTable}
            currentContent={contentEdited}
          />
        )}
      </div>
    </div>
  );
}
