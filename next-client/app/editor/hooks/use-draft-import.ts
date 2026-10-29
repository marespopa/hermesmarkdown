import { useCallback, useRef, useState } from "react";
import type React from "react";
import { useSetAtom, useStore } from "jotai";
import { atom_activePaneId, atom_openFiles } from "@/app/atoms/atoms";
import { atom_openDraft, EMPTY_DRAFT } from "@/app/atoms/file-atoms";
import type { useFileSystem } from "@/app/hooks/use-file-system";
import { focusPaneEditorWhenReady } from "../utils/focus-pane-editor";

export interface PendingDraft {
  text: string;
  name: string;
}

// Imported text always goes into the draft, never the active tab: with a
// vault note open, writing through the active tab replaced the note, and
// autosave then wrote that to disk. "Open File from Disk…" uses the native picker when
// available, otherwise a hidden <input type="file">. `offerDraft` fills an
// empty draft straight away; a draft with text sets `pendingDraft`, so the
// caller can ask before overwriting (DraftImportDialog).
export function useDraftImport(importFile: ReturnType<typeof useFileSystem>["importFile"]) {
  const store = useStore();
  const openDraft = useSetAtom(atom_openDraft);
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(async () => {
    const result = await importFile();
    if (result === null) fileInputRef.current?.click();
  }, [importFile]);

  // Opens the draft in the active pane with the text.
  const applyDraft = useCallback((draft: PendingDraft) => {
    openDraft();
    store.set(atom_openFiles, (prev) => ({
      ...prev,
      draft: { ...(prev.draft ?? EMPTY_DRAFT), content: draft.text, fileName: draft.name },
    }));
    // openDraft has just made the draft's pane active.
    const paneId = store.get(atom_activePaneId);
    if (paneId) focusPaneEditorWhenReady(paneId);
  }, [openDraft, store]);

  const offerDraft = useCallback((draft: PendingDraft) => {
    if (!store.get(atom_openFiles).draft?.content.trim()) applyDraft(draft);
    else setPendingDraft(draft);
  }, [applyDraft, store]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      offerDraft({ text, name: file.name.replace(/\.[^/.]+$/, "") });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmPendingDraft = () => {
    if (pendingDraft) applyDraft(pendingDraft);
    setPendingDraft(null);
  };

  const cancelPendingDraft = () => {
    setPendingDraft(null);
  };

  return {
    handleImport,
    fileInputRef,
    handleFileChange,
    pendingDraft,
    offerDraft,
    confirmPendingDraft,
    cancelPendingDraft,
  };
}
