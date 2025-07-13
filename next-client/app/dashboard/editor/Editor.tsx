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
} from "@/app/atoms/atoms";
import { useDocumentTitle } from "@/app/hooks/use-document-title";
import { useState, useEffect } from "react";
import { PICKER_OPTIONS } from "./components/EditorEmpty";
import { StatusResponse } from "@/app/services/save-utils";
import matter from "gray-matter";
import Loading from "@/app/components/Loading";
import TemplateSelectionModal from "../templates/TemplateSelectionModal";
import { useCommand } from "@/app/hooks/use-command";
import FileSelectionModal from "../components/FileSelectionModal";
import FindAndReplaceModal from "../components/FindAndReplaceModal";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { EMPTY_PAGE_TEMPLATE } from "./EditorUtils";
import { useRouter } from "next/navigation";

export default function Editor() {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [timerSettings] = useAtom(atom_timerSettings);
  const [isTimerVisible] = useAtom(atom_showTimer);
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

  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="container max-w-screen-xl mx-auto px-4 sm:px-2 my-8 min-h-screen">
      {isTimerVisible && <Timer settings={timerSettings} />}
      <EditorHeader
        contentEdited={contentEdited}
        frontMatter={frontMatter}
        hasChanges={hasChanges}
        actions={{
          handleNewFile,
          handleOpenFile,
          handleSelectTemplate,
          handleOpenFindAndReplace,
        }}
      />
      <EditorContent
        contentEdited={contentEdited}
        setContentEdited={setContentEdited}
        frontMatter={frontMatter}
        setHasChanges={setHasChanges}
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
  );
}
