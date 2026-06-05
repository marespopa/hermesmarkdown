"use client";

import React, { useRef, useState } from "react";
import { HiOutlineExternalLink, HiOutlinePencil } from "react-icons/hi";
import Button from "../../components/Button";
import DialogModal from "../../components/DialogModal/DialogModal";

interface LinkPillProps {
  url: string;
  label: string;
  pos: { top: number; left: number };
  isMobile: boolean;
  onOpen: () => void;
  onSave: (newLabel: string, newUrl: string) => void;
  onDismiss: () => void;
}

export function LinkPill({ url, label, pos, isMobile, onOpen, onSave, onDismiss }: LinkPillProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [mobileStep, setMobileStep] = useState<"actions" | "edit">("actions");
  const [editLabel, setEditLabel] = useState(label);
  const [editUrl, setEditUrl] = useState(url);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const openEdit = () => {
    setEditLabel(label);
    setEditUrl(url);
    if (isMobile) {
      setMobileStep("edit");
    } else {
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    onSave(editLabel.trim() || label, editUrl.trim() || url);
    setIsEditing(false);
  };

  const handleDesktopClose = () => {
    setIsEditing(false);
    onDismiss();
  };

  // --- Shared edit form ---
  const editForm = (isMobileVariant: boolean) => (
    <div className="flex flex-col gap-5">
      <h2 className="text-ui-body font-semibold text-zinc-900 dark:text-zinc-100">
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
            if (e.key === "Escape") { if (isMobileVariant) { setMobileStep("actions"); } else { handleDesktopClose(); } }
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
            if (e.key === "Escape") { if (isMobileVariant) { setMobileStep("actions"); } else { handleDesktopClose(); } }
          }}
          className="px-3 py-2 text-ui-footnote rounded-xl border border-zinc-200 dark:border-zinc-700
            bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono
            outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500
            transition-colors"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="outlined"
          onClick={() => isMobileVariant ? setMobileStep("actions") : handleDesktopClose()}
        >
          {isMobileVariant ? "Back" : "Cancel"}
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );

  // --- Mobile: full action sheet via DialogModal ---
  if (isMobile) {
    const handleMobileClose = mobileStep === "actions" ? onDismiss : () => setMobileStep("actions");

    return (
      <DialogModal
        isOpened={true}
        onClose={handleMobileClose}
        ariaLabelledBy="link-sheet-heading"
      >
        {mobileStep === "actions" ? (
          <div className="flex flex-col">
            <p
              id="link-sheet-heading"
              className="text-ui-footnote font-mono text-zinc-500 dark:text-zinc-400 truncate mb-5"
            >
              {url}
            </p>

            <Button
              variant="menu-item"
              className="!py-3.5"
              onClick={onOpen}
            >
              <HiOutlineExternalLink size={20} className="text-blue-500" />
              <span className="text-blue-500">Open Link</span>
            </Button>

            <Button
              variant="menu-item"
              className="!py-3.5"
              onClick={openEdit}
            >
              <HiOutlinePencil size={20} />
              Edit Link
            </Button>
          </div>
        ) : (
          editForm(true)
        )}
      </DialogModal>
    );
  }

  // --- Desktop: floating pill + separate edit dialog ---
  return (
    <>
      <div
        style={{ top: pos.top, left: pos.left }}
        className="absolute z-50 flex items-center gap-0.5 pl-4 pr-1 py-0.5
          bg-white dark:bg-zinc-900
          border border-zinc-200 dark:border-zinc-800
          rounded-full shadow-lg
          text-ui-footnote text-zinc-500 dark:text-zinc-400
          pointer-events-auto select-none"
        onMouseDown={(e) => e.preventDefault()}
      >
        <span className="max-w-[160px] truncate font-mono mr-1">{url}</span>
        <Button
          variant="icon"
          className="!w-7 !h-7"
          onClick={openEdit}
          title="Edit link"
        >
          <HiOutlinePencil size={13} />
        </Button>
        <Button
          variant="icon"
          className="!w-7 !h-7"
          onClick={onOpen}
          title="Open link (⌘↵)"
        >
          <HiOutlineExternalLink size={13} />
        </Button>
      </div>

      {isEditing && (
        <DialogModal
          isOpened={isEditing}
          onClose={handleDesktopClose}
          styles="!max-w-sm"
          ariaLabelledBy="link-edit-heading"
        >
          {editForm(false)}
        </DialogModal>
      )}
    </>
  );
}
