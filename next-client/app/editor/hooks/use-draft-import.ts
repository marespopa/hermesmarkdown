import { useCallback, useRef, useState } from "react";
import type React from "react";
import { useAtom } from "jotai";
import { atom_content, atom_fileName } from "@/app/atoms/atoms";
import type { useFileSystem } from "@/app/hooks/use-file-system";

export interface PendingDraft {
  text: string;
  name: string;
}

// "Import file": uses the native picker when available, otherwise a hidden
// <input type="file">. The file loads into the draft; if the draft already
// has text, `pendingDraft` is set so the caller can ask before overwriting.
export function useDraftImport(importFile: ReturnType<typeof useFileSystem>["importFile"]) {
  const [content, setContent] = useAtom(atom_content);
  const [, setFileName] = useAtom(atom_fileName);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(async () => {
    const result = await importFile();
    if (result === null) fileInputRef.current?.click();
  }, [importFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const nameOnly = file.name.replace(/\.[^/.]+$/, "");
      if (!content.trim()) {
        setContent(text);
        setFileName(nameOnly);
      } else {
        setPendingDraft({ text, name: nameOnly });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmPendingDraft = () => {
    if (pendingDraft) {
      setContent(pendingDraft.text);
      setFileName(pendingDraft.name);
    }
    setPendingDraft(null);
  };

  return {
    handleImport,
    fileInputRef,
    handleFileChange,
    pendingDraft,
    confirmPendingDraft,
    cancelPendingDraft: () => setPendingDraft(null),
  };
}
