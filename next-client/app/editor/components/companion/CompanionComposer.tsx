"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { HiOutlinePaperAirplane, HiOutlinePaperClip, HiOutlineStop } from "react-icons/hi";
import Button from "@/app/components/Button";
import { Textarea } from "@/app/components/Input";
import type { CompanionRequest } from "@/app/atoms/companion-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { ACCEPT_FILES, readAttachments, resolveMentionRefs, type Attachment, type VaultRef } from "../ai-chat/chat-helpers";
import ChatContextChips from "../ai-chat/ChatContextChips";
import MentionMenu from "../ai-chat/MentionMenu";
import { useChatSkills } from "../ai-chat/use-chat-skills";
import { useChatMentions } from "../ai-chat/use-chat-mentions";
import { COMPANION_COMMAND_LIST } from "./companion-commands";
import type { CompanionContext } from "./companion-messages";
import SlashMenu, { type SlashOption } from "./SlashMenu";

interface CompanionComposerProps {
  request: CompanionRequest | null;
  isBusy: boolean;
  onSend: (text: string, context: CompanionContext) => void;
  onStop: () => void;
}

const MAX_HEIGHT = 160;
// As tall as the one-line field (min-h-11).
const BUTTON_SLOT = "flex h-11 shrink-0 items-center justify-center";

// The companion's input: the app's own text field (Input's Textarea, the
// shared field look), with attach and send beside it. An entry point's request (the note in front and its
// selection) becomes removable context chips; @mentions load a note, folder
// or the vault index as chips (use-chat-mentions); files attach. A message
// that is just a /word lists the commands and skills to pick from (Arrow keys,
// Enter or Tab fill one in, Escape closes). Enter sends
// (Shift+Enter: new line) and clears the field and chips at once; while a
// turn runs, the send button stops it.
export default function CompanionComposer({ request, isBusy, onSend, onStop }: CompanionComposerProps) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [vaultRefs, setVaultRefs] = useState<VaultRef[]>([]);
  const [path, setPath] = useState<string | null>(null);
  const [selection, setSelection] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const { skillList } = useChatSkills();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mention, setMention, mentionIndex, setMentionIndex, mentionOptions, detectMention, selectMention } =
    useChatMentions({ input, setInput, inputRef, setVaultRefs, currentFilePath: path ?? undefined });

  // Each new request replaces the note and selection chips and focuses the field.
  const seq = request?.seq;
  useEffect(() => {
    if (!request) return;
    setPath(request.path);
    setSelection(request.selection);
    inputRef.current?.focus();
    // Only a new request (seq), not a re-render of the same one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  // Text set from outside the field (a picked mention, a cleared send) skips
  // its onChange, so the auto-resize runs here too.
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, MAX_HEIGHT)}px`;
  }, [input]);

  // The / menu: only while the whole message is one /word (no space yet).
  const slashQuery = /^\/(\S*)$/.exec(input)?.[1]?.toLowerCase();
  const slashOptions: SlashOption[] = slashQuery === undefined || slashDismissed || mention
    ? []
    : [...COMPANION_COMMAND_LIST, ...skillList()].filter((option) => option.command.startsWith(`/${slashQuery}`));
  const activeSlash = slashOptions[Math.min(slashIndex, slashOptions.length - 1)];

  const selectSlash = (option: SlashOption) => {
    setInput(`${option.command} `);
    inputRef.current?.focus();
  };

  const canSend = !isBusy && (input.trim().length > 0 || attachments.length > 0 || !!selection.trim());

  const send = async () => {
    if (!canSend) return;
    const text = input.trim();
    const context: CompanionContext = { path, selection, vaultRefs, attachments };
    // The field empties at once; @tokens typed straight through resolve after.
    setInput("");
    setAttachments([]);
    setVaultRefs([]);
    setSelection("");
    setMention(null);
    const typedRefs = await resolveMentionRefs(text, context.vaultRefs, fileMetadata, vaultHandle);
    onSend(text, { ...context, vaultRefs: [...context.vaultRefs, ...typedRefs] });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && mentionOptions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionOptions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionOptions.length) % mentionOptions.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); void selectMention(mentionOptions[mentionIndex]); return; }
      if (e.key === "Escape") { e.preventDefault(); setMention(null); return; }
    }
    if (activeSlash) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex((i) => (i + 1) % slashOptions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex((i) => (i - 1 + slashOptions.length) % slashOptions.length); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setSlashDismissed(true); return; }
      // A command typed in full just sends; otherwise Enter completes it.
      const typedInFull = activeSlash.command === input.trim().toLowerCase();
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey && !typedInFull)) { e.preventDefault(); selectSlash(activeSlash); return; }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
  };

  return (
    <div className="relative flex shrink-0 flex-col gap-2 border-t border-edge-subtle px-3 pt-2.5 pb-3">
      {mention && mentionOptions.length > 0 && (
        <MentionMenu options={mentionOptions} activeIndex={mentionIndex} query={mention.query} onSelect={selectMention} />
      )}
      {activeSlash && <SlashMenu options={slashOptions} activeIndex={slashIndex} onSelect={selectSlash} />}
      <ChatContextChips
        path={path}
        selection={selection}
        attachments={attachments}
        vaultRefs={vaultRefs}
        onRemovePath={() => setPath(null)}
        onRemoveSelection={() => setSelection("")}
        onRemoveAttachment={(i) => setAttachments((prev) => prev.filter((_, j) => j !== i))}
        onRemoveVaultRef={(label) => setVaultRefs((prev) => prev.filter((ref) => ref.label !== label))}
      />
      {/* As in Messages: attach, the app's own text field, send. The buttons
          sit centred in slots as tall as a one-line field, at its bottom, so
          they stay level with its last line (touch sizes included). */}
      <div className="flex items-end gap-1.5">
        <div className={BUTTON_SLOT}>
          <Button variant="icon-small" onClick={() => fileInputRef.current?.click()} title="Attach file" aria-label="Attach file">
            <HiOutlinePaperClip size={16} />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept={ACCEPT_FILES}
          onChange={async (e) => {
            const files = e.target.files;
            if (files) {
              const next = await readAttachments(files);
              setAttachments((prev) => [...prev, ...next]);
            }
            e.target.value = "";
          }}
        />
        <Textarea
          ref={inputRef}
          name="companion-message"
          aria-label="Message the AI"
          value={input}
          handleChange={(e) => {
            setInput(e.target.value);
            setSlashIndex(0);
            setSlashDismissed(false);
            detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your notes…"
          rows={1}
          className="!my-0 min-w-0 flex-1"
          textareaClassName="!min-h-11 !resize-none custom-scrollbar"
          style={{ maxHeight: `${MAX_HEIGHT}px` }}
        />
        <div className={BUTTON_SLOT}>
          {isBusy ? (
            <Button variant="unstyled" onClick={onStop} aria-label="Stop" title="Stop"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg text-surface hover:bg-[color-mix(in_srgb,var(--fg)_80%,var(--surface))]">
              <HiOutlineStop size={16} />
            </Button>
          ) : (
            <Button variant="unstyled" onClick={() => void send()} disabled={!canSend} aria-label="Send" title="Send"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                canSend ? "bg-fg text-surface hover:bg-[color-mix(in_srgb,var(--fg)_80%,var(--surface))]" : "bg-fill text-fg-faint cursor-not-allowed"
              }`}>
              <HiOutlinePaperAirplane size={16} className="rotate-90" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
