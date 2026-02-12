import { useAtom } from "jotai";
import { useState } from "react";
import { useCallback, useEffect, useRef } from "react";
import {
  atom_currentFile,
  atom_files,
  atom_selectedFileId,
  Frontmatter,
  OpenFile,
} from "@/app/atoms/atoms";
import { EMPTY_PAGE_TEMPLATE } from "../utils/constants";
import { v4 as uuidv4 } from "uuid";

type EditorFilesResult = {
  files: OpenFile[];
  setFiles: (files: OpenFile[] | ((prev: OpenFile[]) => OpenFile[])) => void;
  selectedFileId: string | null;
  setSelectedFileId: (id: string | null) => void;
  currentFile: OpenFile | null;
  contentEdited: string;
  frontMatter: Frontmatter;
  fileTitle: string;
  fileName: string;
  updateCurrentFileContent: (newContent: string) => void;
  updateCurrentFileFrontMatter: (newFrontMatter: Frontmatter) => void;
};

const useEditorFiles = (): EditorFilesResult => {
  const [files, setFiles] = useAtom(atom_files);
  const [hydrated, setHydrated] = useState(false);
  const [selectedFileId, setSelectedFileId] = useAtom(atom_selectedFileId);
  const [currentFile] = useAtom(atom_currentFile);
  const didInitFileRef = useRef(false);

  const frontMatter = currentFile?.frontMatter || {
    title: "",
    description: "",
    fileName: "file",
    tags: "",
  };
  const contentEdited = currentFile?.contentEdited || "";
  const fileTitle = frontMatter.title || "File";
  const fileName = frontMatter.fileName || fileTitle || "File";

  // Hydration check: only run initialization after first render
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (currentFile || didInitFileRef.current) {
      return;
    }

    if (files.length > 0) {
      if (!selectedFileId) {
        setSelectedFileId(files[0].id);
      }
      didInitFileRef.current = true;
      return;
    }

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

    setFiles([newFile]);
    setSelectedFileId(newFileId);
    didInitFileRef.current = true;
  }, [hydrated, currentFile, files, selectedFileId, setSelectedFileId]);

  const updateCurrentFileContent = useCallback(
    (newContent: string) => {
      if (!currentFile) return;

      const updatedFiles = files.map((file) =>
        file.id === currentFile.id
          ? { ...file, contentEdited: newContent, isSaved: false }
          : file,
      );
      setFiles(updatedFiles);
    },
    [currentFile],
  );

  const updateCurrentFileFrontMatter = useCallback(
    (newFrontMatter: Frontmatter) => {
      if (!currentFile) return;

      const updatedFiles = files.map((file) =>
        file.id === currentFile.id
          ? { ...file, frontMatter: newFrontMatter, isSaved: false }
          : file,
      );
      setFiles(updatedFiles);
    },
    [currentFile, files, setFiles],
  );

  return {
    files,
    setFiles,
    selectedFileId,
    setSelectedFileId,
    currentFile,
    contentEdited,
    frontMatter,
    fileTitle,
    fileName,
    updateCurrentFileContent,
    updateCurrentFileFrontMatter,
  };
};

export default useEditorFiles;
