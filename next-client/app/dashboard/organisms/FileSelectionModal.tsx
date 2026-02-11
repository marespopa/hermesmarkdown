"use client";

import {
  atom_files,
  atom_canOpenMoreFiles,
  atom_selectedFileId,
  OpenFile,
} from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal";
import { useAtom } from "jotai";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FileInput from "@/app/components/FileInput";
import { showErrorToast } from "@/app/components/Toastr";
import {
  getFileDataFromInput,
  isSelectedFileValid,
} from "../editor/utils/file-utilities";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import { SPINNER_LOADING_DURATION } from "@/app/constants/timer";
import Button from "@/app/components/Button";
import { v4 as uuidv4 } from "uuid";
import matter from "gray-matter";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
};

const FileSelectionModal = ({ isOpen, handleClose }: Props) => {
  const router = useRouter();
  const [files, setFiles] = useAtom(atom_files);
  const [canOpenMoreFiles] = useAtom(atom_canOpenMoreFiles);
  const [, setSelectedFileId] = useAtom(atom_selectedFileId);
  const [isLoading, setIsLoading] = useState(false);
  const [fileList] = useState<File[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  if (!isMounted) {
    return <></>;
  }

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={() => {
        handleClose();
      }}
    >
      <div className="p-2">
        {isLoading && <LoadingOverlay isVisible={true} text="Loading..." />}
        <p className="my-4">Select a file to load in the editor:</p>
        <FileInput
          name="file"
          handleChange={(selectedFileList) => {
            if (selectedFileList && selectedFileList[0]) {
              handleOpenFileFromInput(selectedFileList);
            } else {
              showErrorToast(
                "Something went wrong with the file selection. Please try again.",
              );
            }
          }}
          label="Markdown File"
          accept=".md, .txt"
          helperText="Load a markdown file."
        />
        <Button variant="secondary" onClick={handleClose} label="Close" />
      </div>
    </DialogModal>
  );

  async function handleOpenFileFromInput(fileList: FileList) {
    if (!fileList || fileList.length === 0) {
      showErrorToast(
        "Something went wrong with the file selection. Please try again.",
      );
      return;
    }

    let filesToOpen = Array.from(fileList);
    let openedCount = 0;
    setIsLoading(true);
    try {
      for (const file of filesToOpen) {
        if (!canOpenMoreFiles) {
          showErrorToast("Maximum 3 files can be open at once");
          break;
        }
        if (!isSelectedFileValid(file)) {
          showErrorToast("The selected file must be a .md or a .txt file.");
          continue;
        }
        const text = await file.text();
        const { data: frontMatterData, content } = matter(text);
        const newFileId = uuidv4();
        const newFile: OpenFile = {
          id: newFileId,
          content: content,
          contentEdited: content,
          frontMatter: {
            fileName: file.name || "",
            title: frontMatterData?.title || file.name || "Untitled File",
            description: frontMatterData?.description || "",
            tags: frontMatterData?.tags ? frontMatterData?.tags.join(",") : "",
          },
          isSaved: true,
        };
        setFiles((prev) => [...prev, newFile]);
        setSelectedFileId(newFileId);
        openedCount++;
        // Only redirect and close modal for the first file
        if (openedCount === 1) {
          router.push("/dashboard/editor");
          setTimeout(() => {
            handleClose();
          }, SPINNER_LOADING_DURATION);
        }
      }
    } catch (error) {
      showErrorToast("File could not be loaded");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }
};

export default FileSelectionModal;
