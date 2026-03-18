"use client";

import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import {
  atom_pdfPreviewOpen,
  atom_fontFamily,
  atom_fontSize,
  atom_showTimer,
  atom_sidebarCollapsed,
} from "@/app/atoms/atoms";
import { useDocumentTitle } from "@/app/hooks/use-document-title";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { EMPTY_PAGE_TEMPLATE, PICKER_OPTIONS } from "../utils/editor-constants";
import matter from "gray-matter";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import TemplateSelectionModal from "@/app/dashboard/organisms/TemplateSelectionModal";
import { useCommand } from "@/app/hooks/use-command";
import FileSelectionModal from "@/app/dashboard/organisms/FileSelectionModal";
import FindAndReplaceModal from "@/app/dashboard/organisms/FindAndReplaceModal";
import useIsMobile from "@/app/hooks/use-is-mobile";
import FontConfigDialog from "./FontConfigDialog";
import { FaExpand, FaTimes } from "react-icons/fa";
import Button from "@/app/components/Button";
import ExportService from "@/app/services/export-service";
import TableEditorModal from "./TableEditorModal";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import FileTabs from "../molecules/FileTabs";
import { v4 as uuidv4 } from "uuid";
import { copyCleanPrompt } from "@/app/services/prompt-utils";

// Import refactored hooks
import useEditorFiles from "../hooks/use-editor-files";
import { usePromptMenu } from "../hooks/use-prompt-menu";
import { useFindInEditor } from "../hooks/use-find-in-editor";
import { useEditorLaunchFlag } from "../hooks/use-editor-launch-flag";

// Import refactored utils
import EditorHeader from "./EditorHeader";
import EditorContent from "./EditorContent";
import PromptCommandBar from "./PromptCommandBar";
import EditorSkeleton from "@/app/components/EditorSkeleton";
import { TimerContainer } from "@/app/components/Timer/Timer.container";

export default function Editor() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Core state from hooks
  const {
    files,
    setFiles,
    setSelectedFileId,
    currentFile,
    contentEdited,
    frontMatter,
    fileTitle,
    updateCurrentFileContent,
  } = useEditorFiles();

  // Ref to main editor textarea for focus restoration
  const editorTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { menuPosition, handleTextareaReady, closePromptMenu, insertTemplate } =
    usePromptMenu({
      contentEdited,
      updateCurrentFileContent,
    });

  // Wrap handleTextareaReady to capture the textarea ref, memoized to avoid infinite update loop
  const handleTextareaReadyWithRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      // Only assign if not null, to satisfy type
      if (el) editorTextareaRef.current = el;
      handleTextareaReady?.(el);
    },
    [handleTextareaReady],
  );

  const [, setPdfPreviewOpen] = useAtom(atom_pdfPreviewOpen);

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
  const [isTimerVisible] = useAtom(atom_showTimer);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [isFontDialogOpen, setIsFontDialogOpen] = useState(false);
  const [isFindAndReplaceModalVisible, setIsFindAndReplaceModalVisible] =
    useState(false);
  const [isFileSelectModalVisible, setIsFileSelectModalVisible] =
    useState(false);
  const [isTemplateSelectModalVisible, setIsTemplateSelectModalVisible] =
    useState(false);
  const [isTableEditorModalVisible, setIsTableEditorModalVisible] =
    useState(false);

  const isMobile = useIsMobile();

  // Document title
  const [_, setDocumentTitle] = useDocumentTitle("Hermes Markdown Editor");

  // Commands
  useCommand("export", () => exportToMD());
  useCommand("open", () => handleOpenFile());
  useCommand("new", () => handleNewFile());
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
    const fontKey = Object.keys(googleFonts).find((key) =>
      fontFamily.startsWith(key.split(",")[0]),
    );
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


  // Launch flags
  useEditorLaunchFlag("hm_open_table_editor", () => {
    setIsTableEditorModalVisible(true);
  });

  // Handler functions
  const handleNewFile = useCallback(() => {
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
    setFiles((prevFiles) => [...prevFiles, newFile]);
    setSelectedFileId(newFileId);
    setIsLoading(false);
  }, [setSelectedFileId]);

  const handleOpenFile = useCallback(async () => {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker(
        PICKER_OPTIONS,
      );
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
    (
      content: string,
      fileName: string,
      parsedFrontMatter: Record<string, any>,
    ) => {
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

      setFiles((prevFiles) => [...prevFiles, newFile]);
      setSelectedFileId(newFileId);
    },
    [setSelectedFileId],
  );

  const handleInsertTemplate = useCallback(
    (template: string) => {
      insertTemplate(template);
    },
    [insertTemplate],
  );

  const handleClosePromptCommandBar = useCallback(() => {
    closePromptMenu({ removeSlash: true });
    requestAnimationFrame(() => {
      const textarea = document.getElementById(
        "markdown-editor",
      ) as HTMLTextAreaElement | null;
      textarea?.focus({ preventScroll: true });
    });
  }, [closePromptMenu]);

  const handleOpenFindAndReplace = () => setIsFindAndReplaceModalVisible(true);
  const handleOpenTableEditor = () => setIsTableEditorModalVisible(true);
  const handleOpenFontSettings = () => setIsFontDialogOpen(true);

  const handleSaveFontSettings = (family: string, size: string) => {
    setFontFamily(family);
    setFontSize(size);
  };

  const handleInsertTable = (markdownTable: string) => {
    const newContent = contentEdited + "\n\n" + markdownTable + "\n\n";
    updateCurrentFileContent(newContent);
  };

  const handleReplaceTable = (oldTable: string, newTable: string) => {
    const newContent = contentEdited.replace(oldTable, newTable);
    updateCurrentFileContent(newContent);
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
      await ExportService.exportMarkdown(
        currentFile.contentEdited,
        currentFile.frontMatter,
      );
      const updatedFiles = files.map((f) =>
        f.id === currentFile.id
          ? { ...f, content: f.contentEdited, isSaved: true }
          : f,
      );
      setFiles(updatedFiles);
    } catch (error) {
      console.error(error);
    }
  }, [currentFile, files]);

  const handlePdfExport = useCallback(async () => {
    if (!currentFile) return;
    const reportName = (currentFile.frontMatter.fileName || "markdown").replace(
      ".md",
      ".pdf",
    );
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

  const sidebarMargin = isMobile ? "" : collapsed ? "ml-16" : "ml-56";

  function openPreviewExportToPdf() {
    setPdfPreviewOpen(true);
  }

  return (
    <div className="w-full h-screen bg-amber-100 dark:bg-darkbg">
      {/* Main Editor Layout */}
      <div className={`flex h-full flex-col gap-0 px-4`}>
        {isMobile && isTimerVisible && <TimerContainer />}
        
        <FileTabs />

        <EditorHeader
          contentEdited={contentEdited}
          frontMatter={frontMatter}
          onInsertTemplate={handleInsertTemplate}
          actions={{
            handleNewFile,
            handleOpenFile,
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
            fontFamily={fontFamily}
            fontSize={fontSize}
            searchTerm={searchTerm}
            matchCount={matchCount}
            currentIndex={currentIndex}
            onTextareaReady={handleTextareaReadyWithRef}
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
                onOpenTableEditor={handleOpenTableEditor}
                onExportPDF={() => openPreviewExportToPdf()}
                isCompact
                showInput
                forceOpen
                autoFocus
                initialPrompt="/"
                onRequestClose={handleClosePromptCommandBar}
                editorTextareaRef={editorTextareaRef}
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
