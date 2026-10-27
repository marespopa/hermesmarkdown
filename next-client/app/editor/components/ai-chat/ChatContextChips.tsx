"use client";

import React from "react";
import { HiOutlineDocument, HiOutlineDocumentText, HiOutlinePaperClip, HiOutlinePhotograph, HiOutlineX } from "react-icons/hi";
import Button from "@/app/components/Button";
import type { Attachment, VaultRef } from "./chat-helpers";

interface ChatContextChipsProps {
  /** The note the message is about (from the entry point that opened the panel). */
  path?: string | null;
  /** The text selected in it. */
  selection?: string;
  attachments: Attachment[];
  vaultRefs: VaultRef[];
  onRemovePath?: () => void;
  onRemoveSelection?: () => void;
  onRemoveAttachment: (index: number) => void;
  onRemoveVaultRef: (label: string) => void;
}

interface Chip {
  key: string;
  icon: React.ReactNode;
  label: string;
  title?: string;
  onRemove: () => void;
}

// Every chip looks the same: a quiet grey pill with its icon, its name and ×.
function ChipPill({ icon, label, title, onRemove }: Omit<Chip, "key">) {
  return (
    <span className="flex h-6 items-center gap-1 rounded-full bg-fill pl-2 pr-1 text-ui-caption text-fg-muted" title={title ?? label}>
      <span aria-hidden="true" className="flex shrink-0">{icon}</span>
      <span className="max-w-[160px] truncate">{label}</span>
      <Button
        variant="unstyled"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-fill-hover hover:text-fg"
      >
        <HiOutlineX size={10} />
      </Button>
    </span>
  );
}

// The removable context of the AI companion's next message, in one row
// above its input: the note it's about, the selection, the @mention
// references (their content already loaded), then the attached files.
// Renders nothing when there is none.
export default function ChatContextChips({
  path,
  selection = "",
  attachments,
  vaultRefs,
  onRemovePath,
  onRemoveSelection,
  onRemoveAttachment,
  onRemoveVaultRef,
}: ChatContextChipsProps) {
  const chips: Chip[] = [];
  if (path && onRemovePath) {
    chips.push({ key: "path", icon: <HiOutlineDocumentText size={11} />, label: path.split("/").pop() ?? path, title: path, onRemove: onRemovePath });
  }
  if (selection.trim() && onRemoveSelection) {
    const words = selection.trim().split(/\s+/).length;
    chips.push({ key: "selection", icon: null, label: `Selection · ${words} word${words === 1 ? "" : "s"}`, title: selection.slice(0, 300), onRemove: onRemoveSelection });
  }
  for (const ref of vaultRefs) {
    chips.push({ key: `ref:${ref.label}`, icon: <HiOutlineDocument size={11} />, label: ref.label, onRemove: () => onRemoveVaultRef(ref.label) });
  }
  attachments.forEach((a, i) => {
    chips.push({ key: `file:${i}`, icon: a.isImage ? <HiOutlinePhotograph size={11} /> : <HiOutlinePaperClip size={11} />, label: a.name, onRemove: () => onRemoveAttachment(i) });
  });
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(({ key, ...chip }) => <ChipPill key={key} {...chip} />)}
    </div>
  );
}
