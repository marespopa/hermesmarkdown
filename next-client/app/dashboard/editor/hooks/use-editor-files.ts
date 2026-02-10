import { useAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import {
  atom_canOpenMoreFiles,
  atom_currentFile,
  atom_files,
  atom_hasChanges,
  atom_selectedFileId,
  Frontmatter,
  OpenFile,
} from "@/app/atoms/atoms";
import { EMPTY_PAGE_TEMPLATE } from "../utils/constants";
import { v4 as uuidv4 } from "uuid";

type EditorFilesResult = {
  files: OpenFile[];
  setFiles: (files: OpenFile[]) => void;
  selectedFileId: string | null;
  setSelectedFileId: (id: string | null) => void;
  currentFile: OpenFile | null;
  canOpenMoreFiles: boolean;
  hasChanges: boolean;
  setHasChanges: (hasChanges: boolean) => void;
  contentEdited: string;
  frontMatter: Frontmatter;
  fileTitle: string;
  fileName: string;
  updateCurrentFileContent: (newContent: string) => void;
  updateCurrentFileFrontMatter: (newFrontMatter: Frontmatter) => void;
};

export function useEditorFiles(): EditorFilesResult {
  const [files, setFiles] = useAtom(atom_files);
  const [selectedFileId, setSelectedFileId] = useAtom(atom_selectedFileId);
  const [currentFile] = useAtom(atom_currentFile);
  const [canOpenMoreFiles] = useAtom(atom_canOpenMoreFiles);
  const [hasChanges] = useAtom(atom_hasChanges);
  const [, setHasChanges] = useAtom(atom_hasChanges);
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

  useEffect(() => {
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

    setFiles([...files, newFile]);
    setSelectedFileId(newFileId);
    setHasChanges(false);
    didInitFileRef.current = true;
  }, [currentFile, files, selectedFileId, setFiles, setSelectedFileId, setHasChanges]);

  const updateCurrentFileContent = useCallback((newContent: string) => {
    if (!currentFile) return;

    const updatedFiles = files.map((file) =>
      file.id === currentFile.id
        ? { ...file, contentEdited: newContent, isSaved: false }
        : file
    );
    setFiles(updatedFiles);
    setHasChanges(true);
  }, [currentFile, files, setFiles, setHasChanges]);

  const updateCurrentFileFrontMatter = useCallback((newFrontMatter: Frontmatter) => {
    if (!currentFile) return;

    const updatedFiles = files.map((file) =>
      file.id === currentFile.id
        ? { ...file, frontMatter: newFrontMatter, isSaved: false }
        : file
    );
    setFiles(updatedFiles);
    setHasChanges(true);
  }, [currentFile, files, setFiles, setHasChanges]);

  return {
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
  };
}
