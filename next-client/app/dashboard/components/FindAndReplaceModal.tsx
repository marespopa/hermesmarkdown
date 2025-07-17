"use client";

import { atom_contentEdited } from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal";
import { useAtom } from "jotai";
import React, { useState } from "react";
import Input from "@/app/components/Input";
import Button from "@/app/components/Button";
import Checkbox from "@/app/components/Checkbox";
import ClientOnly from "@/app/components/ClientOnly";

type Props = {
  isOpen: boolean;
  handleClose: () => void;
};

const FindAndReplaceModal = ({ isOpen, handleClose }: Props) => {
  const [contentEdited, setContentEdited] = useAtom(atom_contentEdited);
  const [replaceTerm, setReplaceTerm] = useState("");
  const [findTerm, setFindTerm] = useState("");
  const [shouldReplaceAll, setShouldReplaceAll] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);

  function handleReplace() {
    if (!findTerm) return;
    let text = contentEdited;
    let regexConfig = `${shouldReplaceAll ? "g" : ""}${
      isCaseSensitive ? "i" : ""
    }`;
    const escapedSearchTerm = findTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedSearchTerm})`, regexConfig);
    text = text.replace(regex, replaceTerm);
    setContentEdited(text);
    handleClose();
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
