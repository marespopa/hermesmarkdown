"use client";

import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { atom_resumeRequested } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";

// Picks where notes live for writing that started with no vault: the OS
// folder picker (which can also make a new folder), or, where folders can't
// be opened, the browser-vault dialog. A draft with text is saved into the
// chosen folder straight away and stays in front: the home feed doesn't
// open over it (atom_resumeRequested).
export function useChooseFolder(materializeDraft: () => Promise<string | null>) {
  const { openVault, isVaultSupported } = useFileSystem();
  const setResumeRequested = useSetAtom(atom_resumeRequested);

  return useCallback(async () => {
    setResumeRequested(true);
    const opened = await openVault();
    if (opened) {
      await materializeDraft();
    } else if (isVaultSupported) {
      // Picker cancelled. (Without folder access the browser-vault dialog is
      // still open, and the flag is for the vault it makes.)
      setResumeRequested(false);
    }
  }, [openVault, isVaultSupported, materializeDraft, setResumeRequested]);
}
