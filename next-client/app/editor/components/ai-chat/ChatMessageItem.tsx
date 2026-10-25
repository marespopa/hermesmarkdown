"use client";

import React, { useEffect, useState } from "react";
import { HiOutlineCheck, HiOutlineClipboardCheck, HiOutlineDocumentDuplicate, HiOutlinePencil, HiOutlineSearch, HiOutlineSparkles } from "react-icons/hi";
import Button from "@/app/components/Button";
import { FIELD_SURFACE } from "@/app/components/Input";
import type { ChatMessage } from "./chat-helpers";
import type { TemplateBlock } from "./chat-skills";
import TemplateSaveCard from "./TemplateSaveCard";
import { TEMPLATES_FOLDER } from "@/app/utils/templates/template-registry";

export type ApplyMode = "insert" | "replace-all";

interface ChatMessageItemProps {
  message: ChatMessage;
  isEditing: boolean;
  editDraft: string;
  onEditDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onApply: (mode: ApplyMode) => void;
  hasSelection: boolean;
  /** `~~~~hermes-template` blocks in this (assistant) reply; one save card each. */
  templateBlocks?: TemplateBlock[];
  templatesFolder?: string;
  templateExists?: (fileName: string) => boolean;
  /** Absent without an open vault (the card's button is disabled). */
  onSaveTemplate?: (block: TemplateBlock) => Promise<boolean>;
}

// Render text with @mentions highlighted inline
function renderWithMentions(text: string) {
  return text.split(/(@\S+)/g).map((part, i) =>
    part.startsWith("@")
      ? <span key={i} className="text-sage/90 font-medium">{part}</span>
      : part
  );
}

const actionClass = "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-ui-caption transition-colors";

// One turn of the AI Chat thread. Assistant replies can be edited in place
// and applied to the note (insert / replace selection, or replace all), and
// show a save card per template block (template skill).
export default function ChatMessageItem({
  message,
  isEditing,
  editDraft,
  onEditDraftChange,
  onStartEdit,
  onCommitEdit,
  onApply,
  hasSelection,
  templateBlocks = [],
  templatesFolder = TEMPLATES_FOLDER,
  templateExists,
  onSaveTemplate,
}: ChatMessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyMarkdown = () => {
    navigator.clipboard.writeText(isEditing ? editDraft : message.displayContent)
      .then(() => setCopied(true))
      .catch(() => {});
  };
  if (message.kind === "error") {
    return (
      <p role="alert" className="ml-8 text-ui-caption text-[#c65b4a] whitespace-pre-wrap">
        {message.displayContent}
      </p>
    );
  }
  if (message.kind === "activity") {
    return (
      <p className="ml-8 -my-2 flex items-center gap-1.5 text-ui-caption text-fg-faint">
        <HiOutlineSearch size={12} aria-hidden="true" className="shrink-0" />
        {message.displayContent}
      </p>
    );
  }

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-sage/15 flex items-center justify-center shrink-0 mt-0.5">
          <HiOutlineSparkles size={13} className="text-sage" />
        </div>
      )}
      <div className={`flex flex-col gap-1.5 ${isUser ? "items-end max-w-[82%]" : "items-start flex-1 min-w-0"}`}>
        {isUser ? (
          <div className="px-3.5 py-2.5 rounded-xl rounded-tr-sm bg-sage text-white text-ui-footnote whitespace-pre-wrap leading-relaxed">
            {renderWithMentions(message.displayContent)}
          </div>
        ) : isEditing ? (
          <textarea
            value={editDraft}
            onChange={(e) => onEditDraftChange(e.target.value)}
            className={`${FIELD_SURFACE} w-full rounded-[10px] px-3 py-2.5 text-ui-footnote font-mono leading-relaxed resize-none custom-scrollbar`}
            rows={Math.min(18, Math.max(4, editDraft.split("\n").length + 1))}
            autoFocus
          />
        ) : (
          <p className="text-ui-footnote text-ink-light dark:text-ink-dark whitespace-pre-wrap leading-relaxed">
            {message.displayContent}
          </p>
        )}
        {!isUser && (
          <div className="flex items-center gap-1">
            {isEditing ? (
              <Button variant="unstyled" onClick={onCommitEdit} className={`${actionClass} font-medium text-sage hover:bg-fill`}>
                <HiOutlineCheck size={13} /> Done
              </Button>
            ) : (
              <Button variant="unstyled" onClick={onStartEdit} title="Edit response"
                className={`${actionClass} text-fg-faint hover:text-fg hover:bg-fill`}>
                <HiOutlinePencil size={13} /> Edit
              </Button>
            )}
            <Button variant="unstyled" onClick={copyMarkdown} title="Copy response as Markdown"
              className={`${actionClass} text-fg-faint hover:text-fg hover:bg-fill`}>
              {copied ? <HiOutlineCheck size={13} /> : <HiOutlineDocumentDuplicate size={13} />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <span className="text-fg-faint select-none">·</span>
            <Button variant="unstyled" onClick={() => onApply("insert")}
              title={hasSelection ? "Replace the selected text" : "Insert at cursor position"}
              className={`${actionClass} font-medium text-sage hover:bg-fill`}>
              <HiOutlineClipboardCheck size={13} />
              {hasSelection ? "Replace selection" : "Insert at cursor"}
            </Button>
            <Button variant="unstyled" onClick={() => onApply("replace-all")} title="Replace entire document"
              className={`${actionClass} font-medium text-fg-muted hover:text-fg hover:bg-fill`}>
              Replace all
            </Button>
          </div>
        )}
        {!isUser && templateBlocks.map((block, i) => (
          <TemplateSaveCard
            key={`${i}-${block.fileName}`}
            block={block}
            path={`${templatesFolder}/${block.fileName}`}
            exists={templateExists?.(block.fileName) ?? false}
            canSave={!!onSaveTemplate}
            onSave={onSaveTemplate ?? (async () => false)}
          />
        ))}
      </div>
    </div>
  );
}
