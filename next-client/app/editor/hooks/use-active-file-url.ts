"use client";

import { useEffect, useRef, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_activeFilePath, atom_activePaneId, atom_workspaceLayout, getWorkspaceTabs } from "@/app/atoms/atoms";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { FILE_PARAM, readUrlParam, replaceUrlParam } from "../utils/editor-url";

interface UseActiveFileUrlOptions {
  /** The saved vault isn't readable yet: the URL is left alone until it is. */
  isVaultLocked: boolean;
  openFile: (handle: FileSystemFileHandle, path?: string) => Promise<void>;
}

// Mirrors the focused tab's note in the URL as `?file=<path>`, so a refresh
// or a shared link opens that note (see editor-url.ts). Once the vault is
// readable, the URL's note is brought to the front: its tab when one is
// open, in whichever pane, else it is opened from the vault. After that the
// tabs lead: switching notes rewrites the URL in place (no history entry),
// and the draft clears it.
export function useActiveFileUrlSync({ isVaultLocked, openFile }: UseActiveFileUrlOptions) {
  const store = useStore();
  const activeFilePath = useAtomValue(atom_activeFilePath);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const [isRestored, setIsRestored] = useState(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current || isVaultLocked) return;
    hasStartedRef.current = true;
    const target = readUrlParam(FILE_PARAM);
    if (!target || target === store.get(atom_activeFilePath)) {
      setIsRestored(true);
      return;
    }
    const tab = getWorkspaceTabs(store.get(atom_workspaceLayout).rootContainer).find((t) => t.filePath === target);
    if (tab) {
      store.set(atom_activePaneId, tab.paneId);
      store.set(atom_activeFilePath, target);
      setIsRestored(true);
      return;
    }
    if (!vaultHandle) {
      setIsRestored(true);
      return;
    }
    resolveFileHandleAtPath(vaultHandle, target)
      .then((handle) => openFile(handle, target))
      .catch(() => toast.error(`“${target}” isn't in this vault.`))
      .finally(() => setIsRestored(true));
  }, [isVaultLocked, vaultHandle, openFile, store]);

  useEffect(() => {
    if (!isRestored || isVaultLocked) return;
    replaceUrlParam(FILE_PARAM, activeFilePath && activeFilePath !== "draft" ? activeFilePath : null);
    // An old `?view=home` (the removed home view's) no longer means anything.
    replaceUrlParam("view", null);
  }, [isRestored, isVaultLocked, activeFilePath]);
}
