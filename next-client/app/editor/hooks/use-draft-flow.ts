"use client";

import { useCallback, useEffect } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import {
  atom_activeFileHandle,
  atom_activePaneId,
  atom_autosaveMode,
  atom_content,
  atom_fileName,
  atom_openDraft,
  atom_openFiles,
} from "@/app/atoms/atoms";
import { atom_homeFeedOpen } from "@/app/atoms/ui-atoms";
import { useMaterializeDraft } from "./use-materialize-draft";
import { isDraftTitleSettled } from "../utils/draft-title";
import { focusPaneEditorWhenReady } from "../utils/focus-pane-editor";

interface UseDraftFlowOptions {
  vaultHandle: FileSystemDirectoryHandle | null;
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: () => Promise<void>;
}

// The editor page's new-note flow: New file opens a blank draft (no
// dialogs), and a draft in a vault saves itself — named from its first
// line — on autosave once that line is finished, on Cmd+S, or when the
// window loses focus.
export function useDraftFlow({ vaultHandle, scanVault, indexVaultTags }: UseDraftFlowOptions) {
  const store = useStore();
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  const content = useAtomValue(atom_content);
  const autosaveMode = useAtomValue(atom_autosaveMode);
  const openDraft = useSetAtom(atom_openDraft);
  const setContent = useSetAtom(atom_content);
  const setFileName = useSetAtom(atom_fileName);
  const setActiveFileHandle = useSetAtom(atom_activeFileHandle);
  const materializeDraft = useMaterializeDraft({ scanVault, indexVaultTags });

  // Passed to useAutoSave: waits for the first line so the file isn't named
  // after a half-typed title.
  const handleDraftAutosave = useCallback(() => {
    if (!activeFileHandle && vaultHandle && isDraftTitleSettled(content)) {
      void materializeDraft();
    }
  }, [activeFileHandle, vaultHandle, content, materializeDraft]);

  // Leaving the window (or backgrounding the app on mobile) saves a draft
  // right away, even mid-title; manual mode waits for Cmd+S.
  useEffect(() => {
    if (autosaveMode === "manual") return;
    const saveDraft = () => void materializeDraft();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveDraft();
    };
    window.addEventListener("blur", saveDraft);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", saveDraft);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [autosaveMode, materializeDraft]);

  const resetEditor = useCallback(() => {
    // Switch to the draft tab first: content/name/handle setters write to
    // whichever tab is active, and clearing them before the switch would
    // blank the open file's tab instead of the draft.
    openDraft();
    setContent("");
    setFileName("untitled");
    setActiveFileHandle(null);
  }, [openDraft, setActiveFileHandle, setContent, setFileName]);

  // In a vault, a draft already holding text is saved first; if it still
  // holds text (save failed, or it sits in a background tab), it's brought
  // forward instead of being cleared.
  const handleNewFile = useCallback(async () => {
    store.set(atom_homeFeedOpen, false);
    if (vaultHandle) {
      await materializeDraft();
      if (store.get(atom_openFiles).draft?.content.trim()) openDraft();
      else resetEditor();
    } else {
      resetEditor();
    }
    const paneId = store.get(atom_activePaneId);
    if (paneId) focusPaneEditorWhenReady(paneId);
  }, [materializeDraft, openDraft, resetEditor, store, vaultHandle]);

  return { materializeDraft, handleDraftAutosave, handleNewFile };
}
