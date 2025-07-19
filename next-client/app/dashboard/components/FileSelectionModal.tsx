"use client";

import {
  atom_frontMatter,
  atom_content,
  atom_contentEdited,
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
} from "../editor/EditorUtils";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import { SPINNER_LOADING_DURATION } from "@/app/constants/timer";
import Button from "@/app/components/Button";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
};

const FileSelectionModal = ({ isOpen, handleClose }: Props) => {
  const router = useRouter();
  const [, setFrontMatter] = useAtom(atom_frontMatter);
  const [, setContent] = useAtom(atom_content);
  const [, setContentEdited] = useAtom(atom_contentEdited);
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
              showErrorToast("Something went wrong with the file selection. Please try again.");
            }
          }}
          label="Markdown File"
          accept=".md, .txt"
          helperText="Load a markdown file."
        />
        <Button
          variant="secondary"
          onClick={handleClose}
          label="Close"
        />
      </div>
    </DialogModal>
  );

  async function handleOpenFileFromInput(fileList: FileList) {
    if (!fileList[0]) {
      showErrorToast(
        "Something went wrong with the file selection. Please try again."
      );

      return;
    }

    const file = fileList[0];

    if (!isSelectedFileValid(file)) {
      showErrorToast("The selected file must be a .md or a .txt file.");

      return;
    }

    setIsLoading(true);
    const fileData = await getFileDataFromInput(file);
    const fileName = fileData?.filename || "Untitled File";

    setFrontMatter({
      fileName: fileName,
      title: fileData?.frontMatter?.title || fileName,
      description: fileData?.frontMatter?.description || "",
      tags: fileData?.frontMatter?.tags
        ? fileData?.frontMatter?.tags.join(",")
        : "",
    });
    setContent(fileData?.content || "");
    setContentEdited(fileData?.content || "");

    router.push("/dashboard/editor");

    setTimeout(() => {
      handleClose();
    }, SPINNER_LOADING_DURATION); // Delay of 2 seconds

    return;
  }
};

export default FileSelectionModal;
