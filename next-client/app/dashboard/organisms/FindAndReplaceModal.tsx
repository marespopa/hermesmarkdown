"use client";

import { atom_currentFile, atom_files } from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal";
import { useAtom } from "jotai";
import React, { useState } from "react";
import Input from "@/app/components/Input";
import Button from "@/app/components/Button";
import Checkbox from "@/app/components/Checkbox";
import ClientOnly from "@/app/components/ClientOnly";
import { showSuccessToast } from "@/app/components/Toastr";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
};

const FindAndReplaceModal = ({ isOpen, handleClose }: Props) => {
  const [currentFile] = useAtom(atom_currentFile);
  const [files, setFiles] = useAtom(atom_files);
  const [replaceTerm, setReplaceTerm] = useState("");
  const [findTerm, setFindTerm] = useState("");
  const [shouldReplaceAll, setShouldReplaceAll] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);

  function handleReplace() {
    if (!currentFile || !findTerm) return;
    
    let text = currentFile.contentEdited;
    const regexConfig = `${shouldReplaceAll ? "g" : ""}${
      isCaseSensitive ? "" : "i"
    }`;
    const escapedSearchTerm = findTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedSearchTerm})`, regexConfig);
    text = text.replace(regex, replaceTerm);
    
    // Update the current file with the replaced content
    const updatedFiles = files.map(f =>
      f.id === currentFile.id
        ? { ...f, contentEdited: text, isSaved: false }
        : f
    );
    setFiles(updatedFiles);
    
    showSuccessToast("Text has been replaced");
    handleClose();
  }

  if (!currentFile) {
    return null;
  }

  return (
    <ClientOnly>
      <DialogModal isOpened={isOpen} onClose={handleClose}>
        <form className="mt-2 max-w-xl">
          <h3 className="text-2xl mt-1 flex gap-2 items-center justify-between">
            <span>Replace</span>
          </h3>
          <Input
            label="Find"
            name="findTerm"
            value={findTerm}
            handleChange={(e) => setFindTerm(e.currentTarget.value)}
          />
          <Input
            label="Replace With"
            name="replaceTerm"
            value={replaceTerm}
            handleChange={(e) => setReplaceTerm(e.currentTarget.value)}
          />
          <Checkbox
            label="Replace all"
            name="replaceAll"
            checked={shouldReplaceAll}
            handleChange={(e: React.FormEvent<HTMLInputElement>) => {
              setShouldReplaceAll(e.currentTarget.checked);
            }}
          />
          <Checkbox
            label="Case Sensitive"
            name="caseSensitive"
            checked={isCaseSensitive}
            handleChange={(e: React.FormEvent<HTMLInputElement>) => {
              setIsCaseSensitive(e.currentTarget.checked);
            }}
          />
          <div className="flex gap-2 items-center">
            <Button
              variant="primary"
              onClick={handleClose}
              label="Close"
            ></Button>
            <Button
              variant="secondary"
              onClick={handleReplace}
              label="Replace"
            ></Button>
          </div>
        </form>
      </DialogModal>
    </ClientOnly>
  );
};

export default FindAndReplaceModal;
