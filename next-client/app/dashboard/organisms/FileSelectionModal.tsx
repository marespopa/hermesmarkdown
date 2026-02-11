"use client";

import { atom_files, atom_selectedFileId, OpenFile } from "@/app/atoms/atoms";
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
import { createNewOpenFile } from "../editor/utils/file-utilities";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
};

const FileSelectionModal = ({ isOpen, handleClose }: Props) => {
  const router = useRouter();
  const [, setFiles] = useAtom(atom_files);
  const [, setSelectedFileId] = useAtom(atom_selectedFileId);
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
    try {
      let firstFileId: string | null = null;

      await Promise.all(
        Array.from(fileList).map(async (file) => {
          if (!isSelectedFileValid(file)) {
            showErrorToast("The selected file must be a .md or a .txt file.");
            return;
          }
          const fileData = await getFileDataFromInput(file);
          if (!fileData) return;
          const newFile = createNewOpenFile({
            content: fileData.content,
            fileName: fileData.filename,
            frontMatter: fileData.frontMatter,
            isSaved: true,
          });
          setFiles((prevFiles) => [...prevFiles, newFile]);
          setSelectedFileId(newFile.id);
          if (!firstFileId) firstFileId = newFile.id;
        }),
      );
      if (firstFileId) {
        router.push("/dashboard/editor");
        setTimeout(() => {
          handleClose();
        }, SPINNER_LOADING_DURATION);
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
