import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { showErrorToast } from "@/app/components/Toastr";
import { buildIndex, readVaultFile, type MentionOption, type VaultRef } from "./chat-helpers";

interface UseChatMentionsOptions {
  input: string;
  setInput: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  setVaultRefs: React.Dispatch<React.SetStateAction<VaultRef[]>>;
  currentFilePath?: string;
}

// @mention support for the AI Chat input: detects an `@query` before the
// caret, offers vault / folder / note options, and on selection writes the
// resolved label into the text and loads its content as a vault ref.
export function useChatMentions({ input, setInput, inputRef, setVaultRefs, currentFilePath }: UseChatMentionsOptions) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  // All folder paths present in the vault (nested included), excluding _-prefixed segments
  const mentionFolders = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const m of Object.values(fileMetadata)) {
      const segs = m.path.split("/");
      if (segs.some((seg) => seg.startsWith("_"))) continue;
      for (let i = 1; i < segs.length; i++) set.add(segs.slice(0, i).join("/"));
    }
    return Array.from(set).sort();
  }, [fileMetadata]);

  // Combined @ mention options: whole-vault index, folder-scoped index, or a single file
  // (exclude _-prefixed paths). Vault/folder options come first, capped at 8 total.
  const mentionOptions = useMemo<MentionOption[]>(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    const options: MentionOption[] = [];
    if ("vault".includes(q)) options.push({ kind: "vault" });
    for (const folder of mentionFolders) {
      if (options.length >= 8) break;
      if (folder.toLowerCase().includes(q)) options.push({ kind: "folder", path: folder });
    }
    if (options.length < 8) {
      for (const file of Object.values(fileMetadata)
        .filter((m) => !m.path.split("/").some((seg) => seg.startsWith("_")))
        .filter((m) => m.path !== currentFilePath)
        .filter((m) => !q || m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name))) {
        if (options.length >= 8) break;
        options.push({ kind: "file", file });
      }
    }
    return options;
  }, [fileMetadata, mention, currentFilePath, mentionFolders]);

  // Reset mention index when filtered list changes
  useEffect(() => { setMentionIndex(0); }, [mentionOptions]);

  // Detect @mention: scan backwards from the caret for @<query>
  const detectMention = useCallback((value: string, cursor: number) => {
    const match = value.slice(0, cursor).match(/@([^@\s]*)$/);
    setMention(match ? { start: cursor - match[0].length, query: match[1] } : null);
  }, []);

  const selectMention = useCallback(async (option: MentionOption) => {
    if (!mention) return;
    // Replace @<query> with @<resolved-name> inline, keeping the mention in the text
    const label =
      option.kind === "vault" ? "@vault" :
      option.kind === "folder" ? `@folder:${option.path}` :
      `@${option.file.name.replace(/\.md$/, "")}`;
    const before = input.slice(0, mention.start);
    const after = input.slice(mention.start + 1 + mention.query.length);
    setInput(before + label + after);
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
    // Load content; deduplicate by label. @vault/@folder build a lightweight index from
    // in-memory metadata (no extra file reads); a single file is read from disk.
    try {
      const content =
        option.kind === "vault" ? buildIndex(fileMetadata) :
        option.kind === "folder" ? buildIndex(fileMetadata, `${option.path}/`) :
        await readVaultFile(option.file.path, vaultHandle);
      setVaultRefs((prev) => [...prev.filter((r) => r.label !== label), { label, content }]);
    } catch {
      showErrorToast(`Could not load ${label}`);
    }
  }, [mention, input, setInput, inputRef, setVaultRefs, vaultHandle, fileMetadata]);

  return { mention, setMention, mentionIndex, setMentionIndex, mentionOptions, detectMention, selectMention };
}
