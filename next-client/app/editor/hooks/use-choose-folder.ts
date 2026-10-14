"use client";

import { useCallback, useEffect } from "react";
import { atom, useAtomValue, useSetAtom, useStore } from "jotai";
import { atom_openDraft, atom_openFiles, EMPTY_DRAFT } from "@/app/atoms/atoms";
import { atom_resumeRequested } from "@/app/atoms/ui-atoms";
import { atom_isVaultPending, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";

// The draft's text while a folder is being chosen. Opening a vault clears
// every open tab, the draft included, so the text is held here and put back
// once the vault is open.
const atom_draftAwaitingFolder = atom<string | null>(null);

// Picks where notes live for writing begun with no vault: the OS folder
// picker (which can also make a new folder), or, where folders can't be
// opened, the browser-vault dialog. Once a vault opens either way, the draft
// comes back with its text, is saved into the vault at once and stays in
// front: the home feed doesn't open over it (atom_resumeRequested).
export function useChooseFolder(materializeDraft: () => Promise<string | null>) {
  const store = useStore();
  const { openVault, isVaultSupported } = useFileSystem();
  const setResumeRequested = useSetAtom(atom_resumeRequested);
  const setAwaiting = useSetAtom(atom_draftAwaitingFolder);
  const openDraft = useSetAtom(atom_openDraft);
  const awaiting = useAtomValue(atom_draftAwaitingFolder);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const isVaultPending = useAtomValue(atom_isVaultPending);

  useEffect(() => {
    if (awaiting === null || !vaultHandle || isVaultPending) return;
    setAwaiting(null);
    openDraft();
    store.set(atom_openFiles, (prev) => ({
      ...prev,
      draft: { ...(prev.draft ?? EMPTY_DRAFT), content: awaiting },
    }));
    void materializeDraft();
  }, [awaiting, vaultHandle, isVaultPending, setAwaiting, openDraft, store, materializeDraft]);

  return useCallback(async () => {
    const text = store.get(atom_openFiles).draft?.content ?? "";
    setAwaiting(text.trim() ? text : null);
    setResumeRequested(true);
    const opened = await openVault();
    if (!opened && isVaultSupported) {
      // Picker cancelled. (Without folder access the browser-vault dialog is
      // still open, and both are for the vault it makes.)
      setAwaiting(null);
      setResumeRequested(false);
    }
  }, [store, openVault, isVaultSupported, setAwaiting, setResumeRequested]);
}
