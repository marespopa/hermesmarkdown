"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Input from "@/app/components/Input";

interface LinkInsertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (label: string, url: string) => void;
}

// The "Add Link" dialog opened by the /link slash command. Enter in the text
// field moves to the URL; Enter in the URL inserts. Text defaults to "link".
export default function LinkInsertDialog({ isOpen, onClose, onInsert }: LinkInsertDialogProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLabel("");
      setUrl("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const insert = () => onInsert(label || "link", url);

  return (
    <DialogModal isOpened={isOpen} onClose={onClose} styles="!max-w-sm" ariaLabelledBy="link-insert-heading">
      <div className="flex flex-col gap-5">
        <h2 id="link-insert-heading" className="text-ui-body font-semibold text-ink-light dark:text-ink-dark">
          Add Link
        </h2>

        <Input
          name="link-label"
          label="Text"
          value={label}
          handleChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); urlInputRef.current?.focus(); }
            if (e.key === "Escape") onClose();
          }}
          autoFocus
          placeholder="Link text"
          className="my-0"
        />

        <Input
          ref={urlInputRef}
          name="link-url"
          label="URL"
          type="text"
          value={url}
          handleChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); insert(); }
            if (e.key === "Escape") onClose();
          }}
          placeholder="https://"
          className="my-0"
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={insert}>
            Insert
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
