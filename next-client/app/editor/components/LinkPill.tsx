"use client";

import React, { useRef, useState, useEffect } from "react";
import { HiOutlineExternalLink, HiOutlinePencil } from "react-icons/hi";
import Button from "../../components/Button";
import DialogModal from "../../components/DialogModal/DialogModal";
import { PILL_CONTAINER_CLASSES } from "./constants";

interface LinkPillProps {
  url: string;
  label: string;
  pos: { top: number; left: number };
  onOpen: () => void;
  onSave: (newLabel: string, newUrl: string) => void;
  onDismiss: () => void;
}

export function LinkPill({ url, label, pos, onOpen, onSave, onDismiss }: LinkPillProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editUrl, setEditUrl] = useState(url);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditLabel(label);
    setEditUrl(url);
  }, [label, url]);

  const openEdit = () => {
    setIsEditing(true);
  };

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
          <Button
            variant="pill-icon"
            onClick={openEdit}
            title="Edit link"
          >
            <HiOutlinePencil size={16} />
          </Button>
          <Button
            variant="pill-icon"
            onClick={onOpen}
            title="Open link"
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

            <div className="flex flex-col gap-1.5">
              <label className="text-ui-footnote text-zinc-500 dark:text-zinc-400">Text</label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); urlInputRef.current?.focus(); }
                  if (e.key === "Escape") { handleClose(); }
                }}
                autoFocus
                className="px-3 py-2 text-ui-footnote rounded-xl border border-zinc-200 dark:border-zinc-700
                  bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                  outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500
                  transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-ui-footnote text-zinc-500 dark:text-zinc-400">URL</label>
              <input
                ref={urlInputRef}
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleSave(); }
                  if (e.key === "Escape") { handleClose(); }
                }}
                className="px-3 py-2 text-ui-footnote rounded-xl border border-zinc-200 dark:border-zinc-700
                  bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono
                  outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500
                  transition-colors"
              />
            </div>

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
