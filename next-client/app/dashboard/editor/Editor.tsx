"use client";

import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { atom_fontFamily, atom_fontSize, atom_sidebarCollapsed, atom_showTimer, Frontmatter } from "@/app/atoms/atoms";
import { useDocumentTitle } from "@/app/hooks/use-document-title";
import { useState, useEffect, useCallback, useRef } from "react";
import { EMPTY_PAGE_TEMPLATE, PICKER_OPTIONS } from "./utils/editor-constants";
import { StatusResponse } from "@/app/services/save-utils";
import matter from "gray-matter";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import TemplateSelectionModal from "../templates/TemplateSelectionModal";
import { useCommand } from "@/app/hooks/use-command";
import FileSelectionModal from "../components/FileSelectionModal";
import FindAndReplaceModal from "../components/FindAndReplaceModal";
import useIsMobile from "@/app/hooks/use-is-mobile";
import FontConfigDialog from "./components/EditorHeader/FontConfigDialog";
import { FaExpand, FaTimes } from "react-icons/fa";
import Button from "@/app/components/Button";
import ExportService from "@/app/services/export-service";
import TableEditorModal from "./components/TableEditorModal";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import { FileTabs } from "./components/FileTabs";
import { v4 as uuidv4 } from "uuid";
import { copyCleanPrompt } from "@/app/services/prompt-utils";

// Import refactored hooks
import { useEditorFiles } from "./hooks/use-editor-files";
import { usePromptMenu } from "./hooks/use-prompt-menu";
import { useFindInEditor } from "./hooks/use-find-in-editor";
import { useEditorLaunchFlag } from "./hooks/use-editor-launch-flag";

// Import refactored utils
import EditorHeader from "./components/EditorHeader";
import EditorContent from "./components/EditorContent";
import Timer from "@/app/components/Timer";
import PromptCommandBar from "./components/EditorHeader/PromptCommandBar";

export default function Editor() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Core state from hooks
  const {
    files,
    setFiles,
    selectedFileId,
    setSelectedFileId,
    currentFile,
    canOpenMoreFiles,
    hasChanges,
    setHasChanges,
    contentEdited,
    frontMatter,
    fileTitle,
    fileName,
    updateCurrentFileContent,
    updateCurrentFileFrontMatter,
  } = useEditorFiles();

  const {
    menuPosition,
    handleTextareaReady,
    closePromptMenu,
    insertTemplate,
  } = usePromptMenu({
    contentEdited,
    updateCurrentFileContent,
  });

  const {
    searchTerm,
    setSearchTerm,
    matchCount,
    currentIndex,
    setCurrentIndex,
    showFindBar,
    setShowFindBar,
    findInputRef,
    handleNext,
    handlePrev,
    handleClear,
  } = useFindInEditor({
    contentEdited,
    isMobile: useIsMobile(),
  });

  // UI state
  const [collapsed] = useAtom(atom_sidebarCollapsed);
  const [isTimerVisible, setShowTimer] = useAtom(atom_showTimer);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [isFontDialogOpen, setIsFontDialogOpen] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isFindAndReplaceModalVisible, setIsFindAndReplaceModalVisible] = useState(false);
  const [isFileSelectModalVisible, setIsFileSelectModalVisible] = useState(false);
  const [isTemplateSelectModalVisible, setIsTemplateSelectModalVisible] = useState(false);
  const [isTableEditorModalVisible, setIsTableEditorModalVisible] = useState(false);

  const zenButtonRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  // Document title
  const [_, setDocumentTitle] = useDocumentTitle("Hermes Markdown");

  // Commands
  useCommand("export", () => exportToMD());
  useCommand("open", () => handleOpenFile());
  useCommand("new", () => handleNewFile());
  useCommand("template", () => handleSelectTemplate());
  useCommand("table", () => handleOpenTableEditor());
  useCommand("home", () => router.push("/dashboard"));

  // Mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Document title effect
  useEffect(() => {
    setDocumentTitle(fileTitle);
  }, [fileTitle, setDocumentTitle]);

  // Font loading effect
  useEffect(() => {
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

  // Zen mode escape effect
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

  // Launch flags
  useEditorLaunchFlag("hm_open_table_editor", () => {
    setIsTableEditorModalVisible(true);
  });

  // Handler functions
  const handleNewFile = useCallback(() => {
    if (!canOpenMoreFiles) {
      showErrorToast("Maximum 3 files can be open at once");
      return;
    }

    setIsLoading(true);
    const newFileId = uuidv4();
    const newFile = {
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
    setIsLoading(false);
  }, [canOpenMoreFiles, setFiles, setSelectedFileId, files]);

  const handleOpenFile = useCallback(async () => {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker(PICKER_OPTIONS);
      const file = await fileHandle.getFile();
      await parseAndAddFile(file);
    } catch (error) {
      console.error("Error opening file:", error);
    }
  }, []);

  const parseAndAddFile = useCallback(async (file: File) => {
    if (!file) {
      showErrorToast("File could not be loaded");
      return;
    }
    try {
      const text = await file.text();
      const { data: frontMatter, content } = matter(text);
      loadAndAddFileData(content, file.name, frontMatter);
    } catch (error) {
      showErrorToast("Error parsing file");
      console.error(error);
    }
  }, []);

  const loadAndAddFileData = useCallback(
    (content: string, fileName: string, parsedFrontMatter: Record<string, any>) => {
      if (!canOpenMoreFiles) {
        showErrorToast("Maximum 3 files can be open at once");
        return;
      }

      const newFileId = uuidv4();
      const newFile = {
        id: newFileId,
        content,
        contentEdited: content,
        frontMatter: {
          fileName: fileName.replace(/\.[^.]*$/, ""),
          title: parsedFrontMatter.title || fileName.replace(/\.[^.]*$/, ""),
          description: parsedFrontMatter.description || "",
          tags: parsedFrontMatter.tags || "",
        },
        isSaved: true,
      };

      setFiles([...files, newFile]);
      setSelectedFileId(newFileId);
    },
    [files, setFiles, setSelectedFileId, canOpenMoreFiles]
  );

  const handleInsertTemplate = useCallback(
    (template: string) => {
      insertTemplate(template);
    },
    [insertTemplate]
  );

  const handleClosePromptCommandBar = useCallback(() => {
    closePromptMenu({ removeSlash: true });
    requestAnimationFrame(() => {
      const textarea = document.getElementById("markdown-editor") as HTMLTextAreaElement | null;
      textarea?.focus({ preventScroll: true });
    });
  }, [closePromptMenu]);

  const handleOpenFindAndReplace = () => setIsFindAndReplaceModalVisible(true);
  const handleSelectTemplate = () => setIsTemplateSelectModalVisible(true);
  const handleOpenTableEditor = () => setIsTableEditorModalVisible(true);
  const handleOpenFontSettings = () => setIsFontDialogOpen(true);

  const handleSaveFontSettings = (family: string, size: string) => {
    setFontFamily(family);
    setFontSize(size);
  };

  const handleInsertTable = (markdownTable: string) => {
    const newContent = contentEdited + "\n\n" + markdownTable + "\n\n";
    updateCurrentFileContent(newContent);
    setHasChanges(true);
  };

  const handleReplaceTable = (oldTable: string, newTable: string) => {
    const newContent = contentEdited.replace(oldTable, newTable);
    updateCurrentFileContent(newContent);
    setHasChanges(true);
  };

  const handleCopyPrompt = async () => {
    const didCopy = await copyCleanPrompt(contentEdited);
    if (didCopy) {
      showCopyToast("Prompt copied");
      return;
    }
    showErrorToast("Prompt could not be copied");
  };

  const exportToMD = useCallback(async () => {
    if (!currentFile) return;
    try {
      await ExportService.exportMarkdown(currentFile.contentEdited, currentFile.frontMatter);
      const updatedFiles = files.map(f =>
        f.id === currentFile.id ? { ...f, content: f.contentEdited, isSaved: true } : f
      );
      setFiles(updatedFiles);
      setHasChanges(false);
    } catch (error) {
      console.error(error);
    }
  }, [currentFile, files, setFiles, setHasChanges]);

  const handlePdfExport = useCallback(async () => {
    if (!currentFile) return;
    const reportName = (currentFile.frontMatter.fileName || "hermesnote").replace(".md", ".pdf");
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      await ExportService.generatePDF("#pdfReport", reportName);
      showCopyToast("File has been exported");
    } catch (error) {
      showErrorToast("File could not be exported");
      console.error(error);
    }
  }, [currentFile]);

  if (!mounted) return null;
  if (isLoading) return <LoadingOverlay isVisible={true} text="Loading..." />;

  const sidebarMargin = isMobile ? "" : (collapsed ? "ml-16" : "ml-56");

  return (
    <div className="w-full h-screen bg-amber-100 dark:bg-darkbg">
      {/* Zen Mode Overlay */}
      {isZenMode && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 dark:bg-white/10 backdrop-blur-md transition-all duration-300" />
          <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen w-screen pointer-events-none">
            <div className="pointer-events-auto w-10/12 h-5/6 max-w-4xl">
              <div className="relative h-full flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1" />
                  <Button
                    ref={zenButtonRef}
                    variant="icon"
                    onClick={() => setIsZenMode(false)}
                    styles="z-50"
                  >
                    <FaTimes />
                  </Button>
                </div>
                <EditorContent
                  contentEdited={contentEdited}
                  setContentEdited={updateCurrentFileContent}
                  setHasChanges={setHasChanges}
                  fontFamily={fontFamily}
                  fontSize={fontSize}
                  searchTerm={searchTerm}
                  matchCount={matchCount}
                  currentIndex={currentIndex}
                  onTextareaReady={handleTextareaReady}
                  zenMode
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Editor Layout */}
      <div className={`flex h-full flex-col gap-0 px-4 ${sidebarMargin}`}>
        {isMobile && isTimerVisible && <Timer />}
        {!isMobile && isTimerVisible && (
          <div className="absolute top-4 right-4">
            <Timer />
          </div>
        )}

        <FileTabs />

        <EditorHeader
          contentEdited={contentEdited}
          frontMatter={frontMatter}
          hasChanges={hasChanges}
          onInsertTemplate={handleInsertTemplate}
          actions={{
            handleNewFile,
            handleOpenFile,
            handleSelectTemplate,
            handleOpenFindAndReplace,
            handleCopyPrompt,
          }}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          matchCount={matchCount}
          setMatchCount={() => {}}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
        />

        <div className="relative">
          <EditorContent
            contentEdited={contentEdited}
            setContentEdited={updateCurrentFileContent}
            setHasChanges={setHasChanges}
            fontFamily={fontFamily}
            fontSize={fontSize}
            searchTerm={searchTerm}
            matchCount={matchCount}
            currentIndex={currentIndex}
            onTextareaReady={handleTextareaReady}
          />

          {/* Prompt Command Bar */}
          {menuPosition.visible && (
            <div
              style={{
                position: "fixed",
                top: menuPosition.top,
                left: menuPosition.left,
                zIndex: 50,
                pointerEvents: "auto",
                minWidth: 320,
                maxWidth: 420,
              }}
            >
              <PromptCommandBar
                contentEdited={contentEdited}
                onInsertTemplate={handleInsertTemplate}
                isCompact
                showInput
                forceOpen
                autoFocus
                initialPrompt="/"
                onRequestClose={handleClosePromptCommandBar}
              />
            </div>
          )}
        </div>

        {/* Modals */}
        <FontConfigDialog
          isOpen={isFontDialogOpen}
          onClose={() => setIsFontDialogOpen(false)}
          onSave={handleSaveFontSettings}
          initialFontFamily={fontFamily}
          initialFontSize={fontSize}
        />
        {isTemplateSelectModalVisible && (
          <TemplateSelectionModal
            isOpen={isTemplateSelectModalVisible}
            handleClose={() => setIsTemplateSelectModalVisible(false)}
          />
        )}
        {isFileSelectModalVisible && (
          <FileSelectionModal
            isOpen={isFileSelectModalVisible}
            handleClose={() => setIsFileSelectModalVisible(false)}
          />
        )}
        {isFindAndReplaceModalVisible && (
          <FindAndReplaceModal
            isOpen={isFindAndReplaceModalVisible}
            handleClose={() => setIsFindAndReplaceModalVisible(false)}
          />
        )}
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
