"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  HiOutlineSparkles,
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
  HiOutlineX,
  HiOutlinePhotograph,
  HiOutlinePencil,
  HiOutlineCheck,
  HiOutlineClipboardCheck,
  HiOutlineCamera,
  HiOutlineDocument,
} from "react-icons/hi";
import { useAtomValue } from "jotai";
import DialogModal from "../../components/DialogModal/DialogModal";
import { callAIChat, type ApiMessage, type ApiPart } from "@/app/services/ai";
import { showErrorToast } from "@/app/components/Toastr";
import { FORMULA_PRESERVATION_RULE } from "../hooks/useAIEditorActions";
import { useVaultAgentContext } from "../hooks/useVaultAgentContext";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_isDriveVault, atom_drivePathIndex } from "@/app/atoms/drive-atoms";
import * as driveClient from "@/app/services/drive/client";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_SIZE = 5_000_000;
const ACCEPT_IMAGES = "image/png,image/jpeg,image/gif,image/webp";
const ACCEPT_FILES = "*/*";

interface ChatMessage {
  role: "user" | "assistant";
  displayContent: string;
  apiContent: string | ApiPart[];
}

interface Attachment {
  name: string;
  isImage: boolean;
  mimeType: string;
  data: string;
}

// Vault file references loaded via @mention — kept separate from file attachments.
// Content is injected into the API payload; the @name stays inline in the display text.
interface VaultRef {
  label: string;   // "@filename" exactly as it appears in the text
  content: string;
}

export type ApplyMode = "insert" | "replace-all";

interface AIChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentContent: string;
  selectedText: string;
  currentFilePath?: string;
  onApply: (suggestion: string, mode: ApplyMode) => void;
}

const SYSTEM_PROMPT = `You are an AI writing assistant for HermesMarkdown, a markdown note-taking app.
You help users write, edit, and improve their markdown documents through conversation.

${FORMULA_PRESERVATION_RULE}

When the user asks you to create or modify content:
- Output only the content itself — no preamble, meta-commentary, or surrounding quotes.
- Preserve all existing Markdown formatting unless explicitly asked to change it.
- Use proper Markdown syntax (headings, lists, bold, etc.) as appropriate.
- When revising a section, return the complete revised section ready to apply.`;

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildApiContent(text: string, atts: Attachment[]): string | ApiPart[] {
  const hasImages = atts.some((a) => a.isImage);
  if (!atts.length) return text;
  if (!hasImages) {
    const blocks = atts
      .map((a) => `--- File: ${a.name} ---\n${a.data}\n--- End: ${a.name} ---`)
      .join("\n\n");
    return text ? `${text}\n\n${blocks}` : blocks;
  }
  const parts: ApiPart[] = [];
  if (text) parts.push({ type: "text", text });
  for (const att of atts) {
    if (att.isImage) {
      const base64 = att.data.split(",")[1] ?? att.data;
      parts.push({ type: "image", image: base64, mimeType: att.mimeType });
    } else {
      parts.push({ type: "text", text: `--- File: ${att.name} ---\n${att.data}\n--- End: ${att.name} ---` });
    }
  }
  return parts;
}

async function readVaultFile(
  path: string,
  vaultHandle: any,
  isDriveVault: boolean,
  drivePathIndex: any,
): Promise<string> {
  if (isDriveVault && drivePathIndex) {
    const entry = drivePathIndex.getEntry(path);
    if (!entry) throw new Error(`File not found: ${path}`);
    return await driveClient.getFileContent(entry.id);
  }
  if (vaultHandle) {
    const parts = path.split("/");
    let current: any = vaultHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      current = await current.getDirectoryHandle(parts[i]);
    }
    const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
    const file = await fileHandle.getFile();
    return await file.text();
  }
  throw new Error("No vault available");
}

export default function AIChatDialog({
  isOpen,
  onClose,
  documentContent,
  selectedText,
  currentFilePath,
  onApply,
}: AIChatDialogProps) {
  const vaultAgentContext = useVaultAgentContext();
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const isDriveVault = useAtomValue(atom_isDriveVault);
  const drivePathIndex = useAtomValue(atom_drivePathIndex);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  // Vault refs loaded via @mention for the current (unsent) message
  const [vaultRefs, setVaultRefs] = useState<VaultRef[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // @ mention dropdown state
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered vault files for @ mention (exclude _-prefixed paths)
  const mentionFiles = useMemo<FileMetadata[]>(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return Object.values(fileMetadata)
      .filter((m) => !m.path.split("/").some((seg) => seg.startsWith("_")))
      .filter((m) => m.path !== currentFilePath)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [fileMetadata, mention, currentFilePath]);

  // Reset mention index when filtered list changes
  useEffect(() => { setMentionIndex(0); }, [mentionFiles]);

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
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
    // Detect @mention: scan backwards from cursor for @<query>
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@([^@\s]*)$/);
    if (match) {
      setMention({ start: cursor - match[0].length, query: match[1] });
    } else {
      setMention(null);
    }
  };

  const selectMention = useCallback(async (file: FileMetadata) => {
    if (!mention) return;
    // Replace @<query> with @<resolved-name> inline, keeping the mention in the text
    const label = `@${file.name.replace(/\.md$/, "")}`;
    const before = input.slice(0, mention.start);
    const after = input.slice(mention.start + 1 + mention.query.length);
    const newInput = before + label + after;
    setInput(newInput);
    setMention(null);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
        // Place cursor after the inserted mention
        const pos = before.length + label.length;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    }, 0);
    // Load file content; deduplicate by label
    try {
      const content = await readVaultFile(file.path, vaultHandle, isDriveVault, drivePathIndex);
      setVaultRefs((prev) => [...prev.filter((r) => r.label !== label), { label, content }]);
    } catch {
      showErrorToast(`Could not read ${file.name}`);
    }
  }, [mention, input, vaultHandle, isDriveVault, drivePathIndex]);

  const buildSystemPrompt = useCallback(() => {
    const parts = [SYSTEM_PROMPT];
    if (vaultAgentContext) {
      parts.push(`\n--- VAULT CONTEXT (_agent-context.md) ---\n${vaultAgentContext}\n--- END VAULT CONTEXT ---`);
    }
    if (selectedText.trim()) {
      parts.push(`\n--- SELECTED TEXT (target for edits) ---\n${selectedText}\n--- END SELECTED TEXT ---`);
    } else if (documentContent.trim()) {
      const preview =
        documentContent.length > 3000
          ? documentContent.slice(0, 3000) + "\n\n[document continues…]"
          : documentContent;
      parts.push(`\n--- CURRENT DOCUMENT (for context only — output only the requested content, not the full document) ---\n${preview}\n--- END DOCUMENT ---`);
    }
    return parts.join("\n");
  }, [documentContent, selectedText, vaultAgentContext]);

  const handleAttachFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) { showErrorToast(`${file.name} is too large (max 5 MB).`); continue; }
      try {
        if (IMAGE_TYPES.has(file.type)) {
          const dataUrl = await readAsDataURL(file);
          next.push({ name: file.name, isImage: true, mimeType: file.type, data: dataUrl });
        } else {
          const text = await file.text();
          next.push({ name: file.name, isImage: false, mimeType: file.type, data: text });
        }
      } catch { showErrorToast(`Could not read ${file.name}.`); }
    }
    setAttachments((prev) => [...prev, ...next]);
  };

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && !attachments.length) return;
    if (isLoading) return;

    // Build API text: append vault ref content blocks after the user's message
    const refBlocks = vaultRefs
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
      const reply = await callAIChat(buildSystemPrompt(), apiMessages);
      setMessages((prev) => [...prev, { role: "assistant", displayContent: reply, apiContent: reply }]);
    } catch (err: any) {
      showErrorToast(err.message || "AI request failed.");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, attachments, messages, isLoading, buildSystemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && mentionFiles.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionFiles.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionFiles.length) % mentionFiles.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectMention(mentionFiles[mentionIndex]); return; }
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

  // Render text with @mentions highlighted inline
  const renderWithMentions = (text: string) => {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) =>
      part.startsWith("@")
        ? <span key={i} className="text-sage/90 font-medium">{part}</span>
        : part
    );
  };

  return (
    <DialogModal isOpened={isOpen} onClose={onClose} styles="!max-w-2xl" ariaLabelledBy="ai-chat-title">
      <div className="flex flex-col" style={{ height: "70vh", maxHeight: "620px" }}>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3 shrink-0 pr-8">
          <HiOutlineSparkles className="text-sage" size={16} />
          <h2 id="ai-chat-title" className="text-ui-body font-semibold text-ink-light dark:text-ink-dark">
            AI Chat
          </h2>
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
                <span className="text-neutral-300 dark:text-neutral-600">Type @ to reference a vault file.</span>
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-sage/15 flex items-center justify-center shrink-0 mt-0.5">
                  <HiOutlineSparkles size={13} className="text-sage" />
                </div>
              )}
              <div className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end max-w-[82%]" : "items-start flex-1 min-w-0"}`}>
                {msg.role === "user" ? (
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-sage text-white text-ui-footnote whitespace-pre-wrap leading-relaxed">
                    {renderWithMentions(msg.displayContent)}
                  </div>
                ) : editingIndex === i ? (
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    className="w-full rounded-xl border border-sage/30 bg-neutral-50 dark:bg-neutral-800/60 text-ink-light dark:text-ink-dark px-3 py-2.5 text-ui-footnote font-mono leading-relaxed resize-none outline-none focus:ring-2 focus:ring-sage/25 custom-scrollbar"
                    rows={Math.min(18, Math.max(4, editDraft.split("\n").length + 1))}
                    autoFocus
                  />
                ) : (
                  <p className="text-ui-footnote text-ink-light dark:text-ink-dark whitespace-pre-wrap leading-relaxed">
                    {msg.displayContent}
                  </p>
                )}
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1">
                    {editingIndex === i ? (
                      <button type="button" onClick={() => commitEdit(i)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-ui-caption font-medium text-sage hover:bg-sage/10 transition-colors">
                        <HiOutlineCheck size={13} /> Done
                      </button>
                    ) : (
                      <button type="button" onClick={() => startEdit(i)} title="Edit response"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-ui-caption text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <HiOutlinePencil size={13} /> Edit
                      </button>
                    )}
                    <span className="text-neutral-200 dark:text-neutral-700 select-none">·</span>
                    <button type="button" onClick={() => handleApply(i, "insert")}
                      title={selectedText.trim() ? "Replace the selected text" : "Insert at cursor position"}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-ui-caption font-medium text-sage hover:bg-sage/10 transition-colors">
                      <HiOutlineClipboardCheck size={13} />
                      {selectedText.trim() ? "Replace selection" : "Insert at cursor"}
                    </button>
                    <button type="button" onClick={() => handleApply(i, "replace-all")} title="Replace entire document"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-ui-caption font-medium text-neutral-500 dark:text-neutral-400 hover:text-sage hover:bg-sage/10 transition-colors">
                      Replace all
                    </button>
                  </div>
                )}
              </div>
            </div>
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
          {mention && mentionFiles.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-paper-light dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden z-50">
              {mentionFiles.map((file, i) => (
                <button
                  key={file.path}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectMention(file); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    i === mentionIndex
                      ? "bg-sage/10 text-sage"
                      : "text-ink-light dark:text-ink-dark hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  <HiOutlineDocument size={14} className="shrink-0 text-neutral-400" />
                  <span className="text-ui-footnote font-medium truncate">{file.name.replace(/\.md$/, "")}</span>
                  {file.path.includes("/") && (
                    <span className="text-ui-caption text-neutral-400 dark:text-neutral-500 truncate ml-auto">
                      {file.path.split("/").slice(0, -1).join("/")}
                    </span>
                  )}
                </button>
              ))}
              {mention.query && mentionFiles.length === 0 && (
                <p className="px-3 py-2 text-ui-caption text-neutral-400">No files found</p>
              )}
            </div>
          )}

          <div className={`rounded-2xl border transition-colors ${
            isLoading
              ? "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50"
              : "border-neutral-300 dark:border-neutral-600 bg-paper-light dark:bg-neutral-900 focus-within:border-sage/50 focus-within:ring-2 focus-within:ring-sage/15"
          }`}>
            {/* Pending file attachments (uploaded files, not vault refs) */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-ui-caption bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {a.isImage ? <HiOutlinePhotograph size={11} /> : <HiOutlinePaperClip size={11} />}
                    <span className="max-w-[120px] truncate">{a.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${a.name}`}
                    >
                      <HiOutlineX size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Loaded vault refs — shown as subtle inline badges so user knows content is ready */}
            {vaultRefs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pt-2">
                {vaultRefs.map((r) => (
                  <div key={r.label} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-ui-caption bg-sage/10 text-sage dark:text-sage/80">
                    <HiOutlineDocument size={11} />
                    <span className="max-w-[140px] truncate">{r.label}</span>
                    <button
                      type="button"
                      onClick={() => setVaultRefs((prev) => prev.filter((x) => x.label !== r.label))}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${r.label}`}
                    >
                      <HiOutlineX size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                <button type="button" onClick={() => imageInputRef.current?.click()}
                  title="Attach image" aria-label="Attach image"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <HiOutlineCamera size={17} />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  title="Attach file" aria-label="Attach file"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                  <HiOutlinePaperClip size={17} />
                </button>
              </div>

              <input ref={imageInputRef} type="file" className="hidden" multiple accept={ACCEPT_IMAGES}
                onChange={(e) => handleAttachFiles(e.target.files)}
                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }} />
              <input ref={fileInputRef} type="file" className="hidden" multiple accept={ACCEPT_FILES}
                onChange={(e) => handleAttachFiles(e.target.files)}
                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }} />

              <button type="button" onClick={send} disabled={!canSend} aria-label="Send"
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  canSend
                    ? "bg-sage text-white hover:bg-sage/80"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600 cursor-not-allowed"
                }`}>
                <HiOutlinePaperAirplane size={16} className="rotate-90" />
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-neutral-300 dark:text-neutral-600 mt-1.5">
            Shift+Enter for new line · @ to reference vault files
          </p>
        </div>
      </div>
    </DialogModal>
  );
}
