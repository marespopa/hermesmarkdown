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

export default function Editor() {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsed] = useAtom(atom_sidebarCollapsed);
  const [timerSettings] = useAtom(atom_timerSettings);
  const [isTimerVisible, setShowTimer] = useAtom(atom_showTimer);
  const [frontMatter] = useAtom(atom_frontMatter);
  const fileTitle = frontMatter.title || "File";
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
  const router = useRouter();
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [isFontDialogOpen, setIsFontDialogOpen] = useState(false);

  // Search functionality
  // Remove useSearch import and all useCommand calls for find, findNext, findPrevious
  // Only keep Replace modal logic

  // Find bar state (move to Editor, pass to header and editor)
  const [searchTerm, setSearchTerm] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [_, setDocumentTitle] = useDocumentTitle("Hermes Markdown");

  useCommand("open", () => handleOpenFile());
  useCommand("new", () => handleNewFile());
  useCommand("template", () => handleSelectTemplate());
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
      console.error(error);
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
      {/* Sidebar is rendered by EditorHeader, which is always present and fixed */}
      {/* Main content area is pushed right by sidebar width */}
      <div className={`flex-1 min-h-screen overflow-auto px-8 ${sidebarMargin}`}>
        {isTimerVisible && <Timer settings={timerSettings} onClose={handleCloseTimer} />}
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
      </div>
    </div>
  );
}
