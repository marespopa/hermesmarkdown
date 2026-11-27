"use client";

import { useSetAtom, useStore } from "jotai";
import { useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  atom_isVaultPending,
  atom_isVaultRestoring,
  atom_isRequestingAccess,
  atom_isVaultUnlocking,
  atom_currentDirectoryHandle,
  atom_isCloudVault,
  atom_rebindHandles,
  atom_vaultHandle,
  atom_vaultDescriptor,
} from "@/app/atoms/atoms";
import {
  loadVaultHandle,
  askPermissionWithin,
  requestPermissionFromUserGesture,
  PERMISSION_NO_ANSWER_MS,
} from "@/app/services/idb";
import { withTimeout } from "@/app/utils/with-timeout";
import { markStartup } from "@/app/utils/startup-trace";
import { loadStoredWorkspace } from "./stored-workspace";
import { libraryMounts, realHandle } from "@/app/services/library-roots";
import { buildLibraryHandle, loadLibraryMounts } from "@/app/services/library-store";
import { showActionToast } from "@/app/components/Toastr";
import type { useOpenVault } from "./use-open-vault";

// Each browser-storage or permission step of the restore gets this long; past
// it the restore ends rather than leave the editor on its skeleton for good.
export const STARTUP_STEP_TIMEOUT_MS = 8000;

type Options = {
  vaultHandle: FileSystemDirectoryHandle | null;
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (handle?: FileSystemDirectoryHandle) => Promise<void>;
  detectCloudVault: (handle: FileSystemDirectoryHandle) => boolean;
  initVaultFromHandle: ReturnType<typeof useOpenVault>["initVaultFromHandle"];
  // Asks a locked added folder's access again, from a click (use-library-folders.ts).
  unlockLibraryFolder: (name: string) => Promise<boolean>;
};

// What a tap on "Vault Access Paused" came to: access granted, refused (or
// no prompt shown), or ignored because an earlier tap is still waiting.
export type RestoreResult = "granted" | "denied" | "busy";

// Restoring the saved vault: on load (restoreSavedVault) and from a tap on
// "Vault Access Paused" (restoreVault). Every wait ends: an ask nobody answers
// leaves the vault pending, and a late "granted" still unlocks it.
export function useVaultRestore({ vaultHandle, scanVault, indexVaultTags, detectCloudVault, initVaultFromHandle, unlockLibraryFolder }: Options) {
  const store = useStore();
  const setIsVaultRestoring = useSetAtom(atom_isVaultRestoring);
  const setIsRequestingAccess = useSetAtom(atom_isRequestingAccess);
  const setIsVaultPending = useSetAtom(atom_isVaultPending);
  const setIsVaultUnlocking = useSetAtom(atom_isVaultUnlocking);
  const setVaultHandle = useSetAtom(atom_vaultHandle);
  const setVaultDescriptor = useSetAtom(atom_vaultDescriptor);
  const setCurrentDirectoryHandle = useSetAtom(atom_currentDirectoryHandle);
  const setIsCloudVault = useSetAtom(atom_isCloudVault);
  const rebindHandles = useSetAtom(atom_rebindHandles);

  // A single gesture can reach restoreVault twice (the gate's window listener
  // and the Restore Access button); only the first opens the browser prompt.
  // The guard lets go after PERMISSION_NO_ANSWER_MS without an answer, so the
  // next tap asks again. `attempt` tells a stale attempt from the current one.
  const isRestoringRef = useRef(false);
  const attemptRef = useRef(0);
  // The folders added to the paused vault's library, loaded while it waits,
  // so the tap that asks for the vault can ask for them too.
  const pausedFoldersRef = useRef<{ name: string; handle: FileSystemDirectoryHandle }[]>([]);

  // Added folders still locked once the vault is readable (the browser showed
  // only one prompt for the tap, or the answer was no): a toast offers each
  // one's own prompt, so its open notes needn't wait for a trip to the library.
  const offerLockedFolders = useCallback((root: FileSystemDirectoryHandle) => {
    for (const mount of libraryMounts(root)) {
      if (!mount.locked) continue;
      showActionToast(`“${mount.name}” needs access again.`, "Allow", () => void unlockLibraryFolder(mount.name));
    }
  }, [unlockLibraryFolder]);
  const isUnlockingRef = useRef(false);

  // Access was granted: bind the open notes, list the top folder, index behind
  // the editor. Does nothing once the vault is no longer pending, so a late
  // grant from an earlier ask can't run it twice.
  const unlockVault = useCallback(async (granted: FileSystemDirectoryHandle) => {
    if (!store.get(atom_isVaultPending) || isUnlockingRef.current) return;
    isUnlockingRef.current = true;
    try {
      // Pending (route hidden, inert) until the open notes are bound and the
      // top folder listed; the vault is then indexed behind the editor.
      setIsVaultUnlocking(true);
      markStartup("vault:unlock");
      // Added folders' access is asked again now: the browser may have kept it.
      const primary = realHandle(granted);
      const handle = await withTimeout(buildLibraryHandle(`local:${primary.name}`, primary), STARTUP_STEP_TIMEOUT_MS, "Library folders").catch(() => granted);
      setVaultHandle(handle);
      setCurrentDirectoryHandle(handle);
      setIsCloudVault(false);
      detectCloudVault(primary);
      await rebindHandles(handle);
      await scanVault(handle);
      setIsVaultPending(false);
      setIsVaultUnlocking(false);
      toast.success("Vault restored");
      offerLockedFolders(handle);
      await indexVaultTags(handle);
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to restore vault");
    } finally {
      setIsVaultUnlocking(false);
      isUnlockingRef.current = false;
    }
  }, [store, setVaultHandle, setIsVaultPending, setIsVaultUnlocking, setCurrentDirectoryHandle, setIsCloudVault, detectCloudVault, rebindHandles, scanVault, indexVaultTags, offerLockedFolders]);

  const restoreVault = useCallback(async (): Promise<RestoreResult> => {
    if (!vaultHandle || isRestoringRef.current) return "busy";
    isRestoringRef.current = true;
    const attempt = ++attemptRef.current;
    const release = setTimeout(() => {
      if (attemptRef.current === attempt) isRestoringRef.current = false;
    }, PERMISSION_NO_ANSWER_MS);

    try {
      // Every ask starts here, before any await, while the tap still counts:
      // the vault first, then each added folder, so one tap can unlock the
      // whole library. A browser that shows one prompt per tap refuses the
      // rest; those folders are then offered one by one (offerLockedFolders).
      const vaultAsk = requestPermissionFromUserGesture(realHandle(vaultHandle));
      const folderAsks = pausedFoldersRef.current.map((folder) =>
        requestPermissionFromUserGesture(folder.handle).catch(() => false),
      );
      const granted = await vaultAsk.finally(() => clearTimeout(release));
      if (!granted) return "denied";
      // The folders' prompts may still be open; wait for them a little, so
      // an answer given now counts, but never hold the vault for long.
      await withTimeout(Promise.all(folderAsks), PERMISSION_NO_ANSWER_MS, "Library folders' access").catch(() => {});
      await unlockVault(vaultHandle);
      return "granted";
    } catch (err: any) {
      console.error("File System Error:", err?.message || err);
      toast.error("Failed to restore vault");
      return "denied";
    } finally {
      if (attemptRef.current === attempt) isRestoringRef.current = false;
    }
  }, [vaultHandle, unlockVault]);

  // Restores the saved vault, resolving whether there was one to restore.
  const restoreSavedVault = useCallback(async (): Promise<boolean> => {
    markStartup("vault:load-handle");
    const savedHandle = await withTimeout(loadVaultHandle(), STARTUP_STEP_TIMEOUT_MS, "Vault handle");
    if (savedHandle) {
      setVaultHandle(savedHandle);
      setVaultDescriptor({ kind: "local" });
      // The browser's Allow prompt opens right here when a click is still fresh
      // (Resume on the landing page). Without one the browser refuses, and the
      // "Vault Access Paused" overlay asks on the next click instead. If nothing
      // answers in time, that overlay takes over as well.
      markStartup("vault:permission");
      setIsRequestingAccess(true);
      let ask: Awaited<ReturnType<typeof askPermissionWithin>>;
      try {
        ask = await askPermissionWithin(savedHandle);
      } finally {
        setIsRequestingAccess(false);
      }
      if (ask.result === "granted") {
        // The editor can show while the vault is read, so reveal it now.
        setIsVaultRestoring(false);
        markStartup("vault:readable");
        // The vault's library: the folder plus any folders added to it, built
        // after the ask (checking their access first could use up the click
        // the Allow prompt needs). Folders whose access lapsed open locked,
        // keeping their notes open.
        const root = await withTimeout(buildLibraryHandle(`local:${savedHandle.name}`, savedHandle), STARTUP_STEP_TIMEOUT_MS, "Library folders").catch(() => savedHandle);
        setVaultHandle(root);
        setCurrentDirectoryHandle(root);
        detectCloudVault(savedHandle);
        // Open notes first: their disk text and saving don't wait for the index.
        await rebindHandles(root);
        markStartup("vault:rebound");
        await scanVault(root);
        offerLockedFolders(root);
        await indexVaultTags(root);
      } else {
        setIsVaultPending(true);
        // The added folders, so the tap that asks for the vault asks for them too.
        pausedFoldersRef.current = [];
        void loadLibraryMounts(`local:${savedHandle.name}`, savedHandle).then((folders) => {
          pausedFoldersRef.current = folders;
        });
        if (ask.result === "no-answer") {
          // Still listening: a grant that arrives later unlocks the vault.
          void ask.pending.then((granted) => (granted ? unlockVault(savedHandle) : undefined));
        }
      }
      return true;
    }

    // Browser-storage vaults need no permission prompt.
    try {
      const stored = await withTimeout(loadStoredWorkspace(), STARTUP_STEP_TIMEOUT_MS, "Browser storage vault");
      if (stored) {
        await initVaultFromHandle(stored.handle, {
          descriptor: stored.descriptor,
          persist: false,
          announce: false,
          keepTabs: true,
          onReadable: () => setIsVaultRestoring(false),
        });
        return true;
      }
    } catch (err) {
      console.error("Failed to restore vault from browser storage:", err);
      toast.error("Failed to restore the vault from browser storage.");
    }
    return false;
  }, [store, setVaultHandle, setVaultDescriptor, setIsRequestingAccess, setIsVaultRestoring, setIsVaultPending, setCurrentDirectoryHandle, detectCloudVault, rebindHandles, scanVault, indexVaultTags, unlockVault, initVaultFromHandle, offerLockedFolders]);

  return { restoreVault, restoreSavedVault, unlockVault };
}
