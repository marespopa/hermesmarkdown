"use client";

import React, { useRef, useState, useEffect } from "react";
import { HiOutlineExternalLink, HiOutlinePencil } from "react-icons/hi";
import Button from "../../components/Button";
import Input from "../../components/Input";
import DialogModal from "../../components/DialogModal/DialogModal";
import { PILL_CONTAINER_CLASSES } from "./constants";

interface LinkPillProps {
  url: string;
  label: string;
  pos: { top: number; left: number };
  type?: "url" | "wiki";
  onOpen: () => void;
  onSave: (newLabel: string, newUrl: string) => void;
  onDismiss: () => void;
}

export function LinkPill({
  url,
  label,
  pos,
  type = "url",
  onOpen,
  onSave,
  onDismiss,
}: LinkPillProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editUrl, setEditUrl] = useState(url);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditLabel(label);
    setEditUrl(url);
  }, [label, url]);

  const handleSave = () => {
    onSave(editLabel.trim() || label, editUrl.trim() || url);
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    onDismiss();
  };

  return (
    <>
      {!isEditing && (
        <div
          style={{ top: pos.top, left: pos.left }}
          className={PILL_CONTAINER_CLASSES}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* A wikilink's text is just `[[Note name]]`, edited in place; only URL links get a dialog. */}
          {type === "url" && (
            <Button variant="pill-icon" onClick={() => setIsEditing(true)} title="Edit link">
              <HiOutlinePencil size={16} />
            </Button>
          )}
          <Button
            variant="pill-icon"
            onClick={onOpen}
            title={type === "wiki" ? "Open note (Ctrl/Cmd+Shift+Enter)" : "Open link (Ctrl/Cmd+Shift+Enter)"}
          >
            <HiOutlineExternalLink size={16} />
          </Button>
        </div>
      )}

      {isEditing && (
        <DialogModal
          isOpened={isEditing}
          onClose={handleClose}
          styles="!max-w-sm"
          ariaLabelledBy="link-edit-heading"
        >
          <div className="flex flex-col gap-5">
            <h2 id="link-edit-heading" className="text-ui-body font-semibold text-zinc-900 dark:text-zinc-100">
              Edit Link
            </h2>

            <Input
              name="edit-label"
              label="Text"
              value={editLabel}
              handleChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); urlInputRef.current?.focus(); }
                if (e.key === "Escape") { handleClose(); }
              }}
              autoFocus
              className="my-0"
            />

            <Input
              ref={urlInputRef}
              name="edit-url"
              label="URL"
              type="text"
              value={editUrl}
              handleChange={(e) => setEditUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleSave(); }
                if (e.key === "Escape") { handleClose(); }
              }}
              className="my-0"
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outlined" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </DialogModal>
      )}
    </>
  );
}
