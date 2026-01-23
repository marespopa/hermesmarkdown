"use client";

import EditorHeader from "./components/EditorHeader";
import EditorContent from "./components/EditorContent";
import Timer from "@/app/components/Timer";
import { useAtom } from "jotai";
import {
  atom_files,
  atom_selectedFileId,
  atom_currentFile,
  atom_canOpenMoreFiles,
  atom_hasChanges,
  atom_showTimer,
  atom_timerSettings,
  atom_fontFamily,
  atom_fontSize,
  atom_sidebarCollapsed,
  atom_pomodoroPosition,
  OpenFile,
  Frontmatter,
  atom_contentEdited,
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
import { FileTabs } from "./components/FileTabs";
import { v4 as uuidv4 } from 'uuid';


export default function Editor() {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsed] = useAtom(atom_sidebarCollapsed);
  const [isTimerVisible, setShowTimer] = useAtom(atom_showTimer);
  const [files, setFiles] = useAtom(atom_files);
  const [selectedFileId, setSelectedFileId] = useAtom(atom_selectedFileId);
  const [currentFile] = useAtom(atom_currentFile);
  const [canOpenMoreFiles] = useAtom(atom_canOpenMoreFiles);
  const [hasChanges] = useAtom(atom_hasChanges);
  const [, setContentEdited] = useAtom(atom_contentEdited);
  const [, setHasChanges] = useAtom(atom_hasChanges);
  
  // Convenience accessors for current file data
  const frontMatter = currentFile?.frontMatter || {
    title: "",
    description: "",
    fileName: "file",
    tags: "",
  };
  const contentEdited = currentFile?.contentEdited || "";
  const fileTitle = frontMatter.title || "File";
  const fileName = frontMatter.fileName || fileTitle || "File";
  
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
    if (!canOpenMoreFiles) {
      alert("Maximum 3 files can be open at once");
      return;
    }
    
    setIsLoading(true);
    const newFileId = uuidv4();
    const newFile: OpenFile = {
      id: newFileId,
      content: EMPTY_PAGE_TEMPLATE,
      contentEdited: EMPTY_PAGE_TEMPLATE,
      frontMatter: {
        fileName: "file",
        title: "File",
        description: "",
        tags: "",
      },
      isSaved: true,
    };
    
    setFiles([...files, newFile]);
    setSelectedFileId(newFileId);
    setHasChanges(false);
    setIsLoading(false);
  }

  async function handleOpenFile() {
    if (!canOpenMoreFiles) {
      alert("Maximum 3 files can be open at once");
      return;
    }

    if (isMobile) {
      setIsFileSelectModalVisible(true);
      return;
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker(PICKER_OPTIONS);
      const file = await fileHandle.getFile();

      setIsLoading(true);
      await parseAndAddFile(file);
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

  function parseAndAddFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          await loadAndAddFileData(reader, file.name);
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function loadAndAddFileData(reader: FileReader, fileName: string) {
    const fileContent = String(reader.result);
    const { data: frontMatterData, content } = matter(fileContent);

    return new Promise<void>((resolve, reject) => {
      try {
        const newFileId = uuidv4();
        const newFile: OpenFile = {
          id: newFileId,
          content: content,
          contentEdited: content,
          frontMatter: {
            fileName: fileName || "",
            title: frontMatterData?.title || "",
            description: frontMatterData?.description || "",
            tags: frontMatterData?.tags ? frontMatterData?.tags.join(",") : "",
          },
          isSaved: true,
        };
        
        setFiles([...files, newFile]);
        setSelectedFileId(newFileId);
        setHasChanges(false);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
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
    if (!currentFile) return;
    
    try {
      await ExportService.exportMarkdown(currentFile.contentEdited, currentFile.frontMatter);
      // Update current file to mark as saved
      const updatedFiles = files.map(f => 
        f.id === currentFile.id ? { ...f, content: f.contentEdited, isSaved: true } : f
      );
      setFiles(updatedFiles);
      setHasChanges(false);
    } catch (error) {
      console.error(error);
    }
  }

  function updateCurrentFileContent(newContent: string) {
    if (!currentFile) return;
    
    const updatedFiles = files.map(f => 
      f.id === currentFile.id 
        ? { ...f, contentEdited: newContent, isSaved: false } 
        : f
    );
    setFiles(updatedFiles);
    setHasChanges(true);
  }

  function updateCurrentFileFrontMatter(newFrontMatter: Frontmatter) {
    if (!currentFile) return;
    
    const updatedFiles = files.map(f => 
      f.id === currentFile.id 
        ? { ...f, frontMatter: newFrontMatter, isSaved: false } 
        : f
    );
    setFiles(updatedFiles);
    setHasChanges(true);
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
        {/* File Tabs Component */}
        <FileTabs />
        
        {/* Show empty state if no file is selected */}
        {!currentFile ? (
          <div className="flex items-center justify-center h-full min-h-96 text-gray-500">
            <p>No file open. Create a new file or open an existing one.</p>
          </div>
        ) : (
          <>
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
            <EditorContent
              contentEdited={contentEdited}
              setContentEdited={updateCurrentFileContent}
              setHasChanges={setHasChanges}
              fontFamily={fontFamily}
              fontSize={fontSize}
              searchTerm={searchTerm}
              matchCount={matchCount}
              currentIndex={currentIndex}
            />
          </>
        )}
        <FontConfigDialog
          isOpen={isFontDialogOpen}
          onClose={() => setIsFontDialogOpen(false)}
          onSave={handleSaveFontSettings}
          initialFontFamily={fontFamily}
          initialFontSize={fontSize}
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
