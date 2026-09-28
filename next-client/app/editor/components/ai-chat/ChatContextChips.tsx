"use client";

import React from "react";
import { HiOutlineDocument, HiOutlinePaperClip, HiOutlinePhotograph, HiOutlineX } from "react-icons/hi";
import Button from "@/app/components/Button";
import type { Attachment, VaultRef } from "./chat-helpers";

interface ChatContextChipsProps {
  attachments: Attachment[];
  vaultRefs: VaultRef[];
  onRemoveAttachment: (index: number) => void;
  onRemoveVaultRef: (label: string) => void;
}

const removeClass = "ml-0.5 hover:text-red-500 transition-colors";

// Removable chips above the AI Chat input: uploaded attachments, then the
// @mention references whose content is already loaded for the next message.
export default function ChatContextChips({ attachments, vaultRefs, onRemoveAttachment, onRemoveVaultRef }: ChatContextChipsProps) {
  return (
    <>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-ui-caption bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              {a.isImage ? <HiOutlinePhotograph size={11} /> : <HiOutlinePaperClip size={11} />}
              <span className="max-w-[120px] truncate">{a.name}</span>
              <Button variant="unstyled" onClick={() => onRemoveAttachment(i)} className={removeClass} aria-label={`Remove ${a.name}`}>
                <HiOutlineX size={11} />
              </Button>
            </div>
          ))}
        </div>
      )}
      {vaultRefs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2">
          {vaultRefs.map((r) => (
            <div key={r.label} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-ui-caption bg-sage/10 text-sage dark:text-sage/80">
              <HiOutlineDocument size={11} />
              <span className="max-w-[140px] truncate">{r.label}</span>
              <Button variant="unstyled" onClick={() => onRemoveVaultRef(r.label)} className={removeClass} aria-label={`Remove ${r.label}`}>
                <HiOutlineX size={11} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
