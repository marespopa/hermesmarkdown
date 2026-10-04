"use client";

import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import { showErrorToast } from "@/app/components/Toastr";
import { type ApiMessage, callAIChat } from "@/app/services/ai";
import { useAtomValue } from "jotai";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { HiOutlineCamera, HiOutlinePaperAirplane, HiOutlinePaperClip, HiOutlineSparkles } from "react-icons/hi";
import DialogModal from "../../components/DialogModal/DialogModal";
import { ACCEPT_FILES, ACCEPT_IMAGES, type Attachment, buildApiContent, buildChatSystemPrompt, type ChatMessage, readAttachments, resolveMentionRefs, type VaultRef } from "./ai-chat/chat-helpers";
import ChatContextChips from "./ai-chat/ChatContextChips";
import ChatMessageItem, { type ApplyMode } from "./ai-chat/ChatMessageItem";
import MentionMenu from "./ai-chat/MentionMenu";
import { useChatMentions } from "./ai-chat/use-chat-mentions";
import { useChatModels } from "./ai-chat/use-chat-models";
import { useChatSkills } from "./ai-chat/use-chat-skills";
import { parseTemplateBlocks } from "./ai-chat/chat-skills";

export type { ApplyMode };

interface AIChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentContent: string;
  selectedText: string;
  currentFilePath?: string;
  onApply: (suggestion: string, mode: ApplyMode) => void;
}

export default function AIChatDialog({
  isOpen,
  onClose,
  documentContent,
  selectedText,
  currentFilePath,
  onApply,
}: AIChatDialogProps) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const vaultHandle = useAtomValue(atom_vaultHandle);

  const { modelOptions, selectedAiModel, setSelectedAiModel, isFetchingModels } = useChatModels(isOpen);
  const skills = useChatSkills();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  // Vault refs loaded via @mention for the current (unsent) message
  const [vaultRefs, setVaultRefs] = useState<VaultRef[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mention, setMention, mentionIndex, setMentionIndex, mentionOptions, detectMention, selectMention } =
    useChatMentions({ input, setInput, inputRef, setVaultRefs, currentFilePath });

  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInput("");
      setAttachments([]);
      setVaultRefs([]);
      setEditingIndex(null);
      setMention(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, setMention]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Voice-dictated text bypasses the textarea's own onChange, so the
  // auto-resize it normally does on keystroke has to be reproduced here too.
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
    detectMention(val, e.target.selectionStart ?? val.length);
  };

  const buildSystemPrompt = useCallback(
    (skillInstructions: string[] = []) =>
      buildChatSystemPrompt(documentContent, selectedText, currentFilePath, skillInstructions),
    [documentContent, selectedText, currentFilePath],
  );

  const handleAttachFiles = async (files: FileList | null) => {
    if (!files) return;
    const next = await readAttachments(files);
    setAttachments((prev) => [...prev, ...next]);
  };

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && !attachments.length) return;
    if (isLoading) return;

    // Catch any @vault/@folder/@file tokens typed straight through without ever being
    // picked from the dropdown, so they still resolve instead of reaching the model as text.
    const autoRefs = await resolveMentionRefs(trimmed, vaultRefs, fileMetadata, vaultHandle);
    const allRefs = [...vaultRefs, ...autoRefs];

    // Build API text: append vault ref content blocks after the user's message
    const refBlocks = allRefs
      .map((r) => `\n--- ${r.label} ---\n${r.content}\n--- End ${r.label} ---`)
      .join("\n");
    const apiText = trimmed + refBlocks;

    const displayContent = trimmed || "(see attached files)";
    const apiContent = buildApiContent(apiText || "(see attached files)", attachments);

    const userMsg: ChatMessage = { role: "user", displayContent, apiContent };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput("");
    setAttachments([]);
    setVaultRefs([]);
    setEditingIndex(null);
    setMention(null);
    setIsLoading(true);

    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const apiMessages: ApiMessage[] = newMessages.map((m) => ({ role: m.role, content: m.apiContent }));
      const skillInstructions = await skills.skillInstructionsFor(newMessages);
      const reply = await callAIChat(buildSystemPrompt(skillInstructions), apiMessages);
      setMessages((prev) => [...prev, { role: "assistant", displayContent: reply, apiContent: reply }]);
    } catch (err: any) {
      showErrorToast(err.message || "AI request failed.");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, attachments, messages, isLoading, buildSystemPrompt, vaultRefs, fileMetadata, vaultHandle, setMention, skills]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && mentionOptions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionOptions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionOptions.length) % mentionOptions.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectMention(mentionOptions[mentionIndex]); return; }
      if (e.key === "Escape") { e.preventDefault(); setMention(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const startEdit = (i: number) => { setEditingIndex(i); setEditDraft(messages[i].displayContent); };

  const commitEdit = (i: number) => {
    setMessages((prev) => prev.map((m, idx) => idx === i ? { ...m, displayContent: editDraft, apiContent: editDraft } : m));
    setEditingIndex(null);
  };

  const handleApply = (i: number, mode: ApplyMode) => {
    const content = editingIndex === i ? editDraft : messages[i].displayContent;
    onApply(content, mode);
  };

  const canSend = !isLoading && (input.trim().length > 0 || attachments.length > 0);

  return (
    <DialogModal isOpened={isOpen} onClose={onClose} styles="!max-w-2xl" ariaLabelledBy="ai-chat-title">
      <div className="flex flex-col" style={{ height: "70vh", maxHeight: "620px" }}>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3 shrink-0 pr-8">
          <HiOutlineSparkles className="text-sage" size={16} />
          <h2 id="ai-chat-title" className="text-ui-body font-semibold text-ink-light dark:text-ink-dark">
            AI Chat
          </h2>
          {currentFilePath && documentContent.trim() && (
            <span
              className="text-ui-caption text-neutral-400 dark:text-neutral-500 truncate min-w-0"
              title={`The AI sees ${currentFilePath}`}
            >
              · {currentFilePath.split("/").pop()}
            </span>
          )}
          <select
            value={selectedAiModel}
            onChange={(e) => setSelectedAiModel(e.target.value)}
            disabled={isFetchingModels}
            title="Model"
            aria-label="Model"
            className="ml-auto text-ui-caption bg-transparent border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-neutral-500 dark:text-neutral-400 outline-none disabled:opacity-50 max-w-[140px] truncate"
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 pb-3">
          {/* Selection context card — always visible at top when a selection was captured */}
          {selectedText.trim() && (
            <div className="rounded-xl border border-sage/25 bg-sage/5 dark:bg-sage/10 px-3 py-2.5 shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sage/70 mb-1.5">Selected text</p>
              <p className="text-ui-caption text-ink-light dark:text-ink-dark font-mono whitespace-pre-wrap leading-relaxed line-clamp-4">
                {selectedText.length > 300 ? selectedText.slice(0, 300) + "…" : selectedText}
              </p>
            </div>
          )}

          {messages.length === 0 && !selectedText.trim() && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center">
                <HiOutlineSparkles size={20} className="text-sage" />
              </div>
              <p className="text-ui-footnote text-neutral-400 dark:text-neutral-500">
                Ask anything about your document,<br />or describe what you want to create.<br />
                <span className="text-neutral-300 dark:text-neutral-600">Type @ to reference a file, folder, or the whole vault.</span>
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessageItem
              key={i}
              message={msg}
              isEditing={editingIndex === i}
              editDraft={editDraft}
              onEditDraftChange={setEditDraft}
              onStartEdit={() => startEdit(i)}
              onCommitEdit={() => commitEdit(i)}
              onApply={(mode) => handleApply(i, mode)}
              hasSelection={!!selectedText.trim()}
              templateBlocks={msg.role === "assistant" ? parseTemplateBlocks(msg.displayContent) : undefined}
              templatesFolder={skills.templatesFolder}
              templateExists={skills.templateExists}
              onSaveTemplate={skills.hasVault ? skills.saveTemplate : undefined}
            />
          ))}

          {isLoading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-sage/15 flex items-center justify-center shrink-0 mt-0.5">
                <HiOutlineSparkles size={13} className="text-sage" />
              </div>
              <div className="flex items-center gap-1 pt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input box */}
        <div className="shrink-0 pt-2 relative">
          {/* @ mention dropdown — floats above the input */}
          {mention && mentionOptions.length > 0 && (
            <MentionMenu options={mentionOptions} activeIndex={mentionIndex} query={mention.query} onSelect={selectMention} />
          )}

          <div className={`rounded-2xl border transition-colors ${
            isLoading
              ? "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50"
              : "border-neutral-300 dark:border-neutral-600 bg-paper-light dark:bg-neutral-900 focus-within:border-sage/50 focus-within:ring-2 focus-within:ring-sage/15"
          }`}>
            <ChatContextChips
              attachments={attachments}
              vaultRefs={vaultRefs}
              onRemoveAttachment={(i) => setAttachments((prev) => prev.filter((_, j) => j !== i))}
              onRemoveVaultRef={(label) => setVaultRefs((prev) => prev.filter((x) => x.label !== label))}
            />

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… (Enter to send, @ to reference a file)"
              disabled={isLoading}
              style={{ height: "44px", minHeight: "44px", maxHeight: "160px" }}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-ui-footnote text-ink-light dark:text-ink-dark placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none disabled:opacity-40 custom-scrollbar"
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <div className="flex items-center gap-0.5">
                <Button variant="unstyled" onClick={() => imageInputRef.current?.click()}
                  title="Attach image" aria-label="Attach image"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <HiOutlineCamera size={17} />
                </Button>
                <Button variant="unstyled" onClick={() => fileInputRef.current?.click()}
                  title="Attach file" aria-label="Attach file"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <HiOutlinePaperClip size={17} />
                </Button>
              </div>

              <input ref={imageInputRef} type="file" className="hidden" multiple accept={ACCEPT_IMAGES}
                onChange={(e) => handleAttachFiles(e.target.files)}
                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }} />
              <input ref={fileInputRef} type="file" className="hidden" multiple accept={ACCEPT_FILES}
                onChange={(e) => handleAttachFiles(e.target.files)}
                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }} />

              <Button variant="unstyled" onClick={send} disabled={!canSend} aria-label="Send"
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  canSend
                    ? "bg-sage text-white hover:bg-sage/80"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600 cursor-not-allowed"
                }`}>
                <HiOutlinePaperAirplane size={16} className="rotate-90" />
              </Button>
            </div>
          </div>
          <p className="text-center text-[10px] text-neutral-300 dark:text-neutral-600 mt-1.5">
            Shift+Enter for new line · @ to reference a file, @vault, or @folder:path
          </p>
        </div>
      </div>
    </DialogModal>
  );
}
