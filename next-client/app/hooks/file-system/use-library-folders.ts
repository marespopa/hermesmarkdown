"use client";

import { useStore } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  atom_vaultHandle,
  atom_vaultDescriptor,
  atom_vaultKey,
  atom_openFiles,
  atom_workspaceLayout,
  atom_rebindHandles,
  atom_currentDirectoryHandle,
  atom_showFolderInFiles,
} from "@/app/atoms/atoms";
import { removePathsFromLayout } from "@/app/atoms/utils";
import {
  CompositeDirectoryHandle,
  chooseMountName,
  libraryMounts,
  realHandle,
  type LibraryMount,
} from "@/app/services/library-roots";
import { saveLibraryMounts } from "@/app/services/library-store";
import { requestPermissionFromUserGesture } from "@/app/services/idb";
import { SKIPPED_DIRS } from "./vault-scan";
import { isVaultSupported, withPickerLock } from "./shared";

interface Args {
  scanVault: (handle: FileSystemDirectoryHandle) => Promise<void>;
  indexVaultTags: (handle?: FileSystemDirectoryHandle) => Promise<void>;
}

function libraryOf(primary: FileSystemDirectoryHandle, mounts: LibraryMount[]): FileSystemDirectoryHandle {
  if (mounts.length === 0) return primary;
  return new CompositeDirectoryHandle(primary, mounts) as unknown as FileSystemDirectoryHandle;
}

async function isSame(a: FileSystemDirectoryHandle, b: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return await (a as any).isSameEntry(b);
  } catch {
    return false;
  }
}

// Whether `inner` is `outer` or somewhere inside it.
async function isWithin(outer: FileSystemDirectoryHandle, inner: FileSystemDirectoryHandle): Promise<boolean> {
  if (await isSame(outer, inner)) return true;
  try {
    return !!(await (outer as any).resolve(inner));
  } catch {
    return false;
  }
}

async function topLevelNames(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = [];
  try {
    for await (const entry of (dir as any).values() as AsyncIterable<FileSystemHandle>) names.push(entry.name);
  } catch {
    // Unreadable: the mount name rules still reserve the rest.
  }
  return names;
}

// Folders added to the open vault's library (services/library-roots.ts):
// adding one, removing one (never touching the disk) and asking a locked
// one's access again. Each answers at once and reads the disk behind it.
export function useLibraryFolders({ scanVault, indexVaultTags }: Args) {
  const store = useStore();

  // Makes `next` the open library and re-reads it: the top folder at once,
  // the whole library indexed behind it (a fresh run, since rebuilding the
  // handle stops any run still going on the old one).
  const applyLibrary = useCallback(async (next: FileSystemDirectoryHandle) => {
    store.set(atom_vaultHandle, next);
    store.set(atom_currentDirectoryHandle, next);
    await store.set(atom_rebindHandles, next);
    await scanVault(next);
    void indexVaultTags();
  }, [store, scanVault, indexVaultTags]);

  const addLibraryFolder = useCallback(async (): Promise<boolean> => {
    const current = store.get(atom_vaultHandle);
    const vaultKey = store.get(atom_vaultKey);
    if (!current || !vaultKey || store.get(atom_vaultDescriptor)?.kind !== "local" || !isVaultSupported) {
      toast.error("Folders can be added to a vault opened from disk.");
      return false;
    }
    const picked = await withPickerLock(async () => {
      try {
        return await window.showDirectoryPicker({ mode: "readwrite" });
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.name === "NotAllowedError") return undefined;
        throw err;
      }
    });
    if (!picked) return false;

    const primary = realHandle(current);
    const mounts = [...libraryMounts(current)];
    // A folder already in the library (or holding it) would list notes twice.
    if (await isWithin(primary, picked) || await isWithin(picked, primary)) {
      toast.error(`“${picked.name}” is already part of this vault.`);
      return false;
    }
    for (const mount of mounts) {
      if (await isWithin(mount.handle, picked) || await isWithin(picked, mount.handle)) {
        toast.error(`“${picked.name}” is already in the library.`);
        return false;
      }
    }

    const name = chooseMountName(picked.name, {
      primaryName: primary.name,
      topLevelNames: await topLevelNames(primary),
      mountNames: mounts.map((m) => m.name),
      skippedDirs: SKIPPED_DIRS,
    });
    const next = [...mounts, { name, handle: picked }];
    // Shown first; saved behind it, and taken back if saving fails.
    const shown = applyLibrary(libraryOf(primary, next));
    try {
      await saveLibraryMounts(vaultKey, primary, next);
    } catch (err) {
      console.error("Failed to save the library's folders:", err);
      await shown.catch(() => undefined);
      await applyLibrary(libraryOf(primary, mounts));
      toast.error(`Couldn't add “${picked.name}”.`);
      return false;
    }
    await shown;
    // Files opens on it: the folder unfolded, selected and scrolled to.
    store.set(atom_showFolderInFiles, name);
    toast.success(`Added “${name}” to the library`);
    return true;
  }, [store, applyLibrary]);

  const removeLibraryFolder = useCallback(async (name: string): Promise<boolean> => {
    const current = store.get(atom_vaultHandle);
    const vaultKey = store.get(atom_vaultKey);
    const mounts = [...libraryMounts(current)];
    const mount = mounts.find((m) => m.name === name);
    if (!current || !vaultKey || !mount) return false;

    const inFolder = (p: string) => p === name || p.startsWith(`${name}/`);
    const openFiles = store.get(atom_openFiles);
    const unsaved = Object.entries(openFiles).some(
      ([path, state]) => inFolder(path) && state.content !== state.lastSavedContent,
    );
    if (unsaved) {
      toast.error(`Save the notes open from “${name}” first.`);
      return false;
    }

    const primary = realHandle(current);
    const next = mounts.filter((m) => m !== mount);
    // Its notes close; the files stay where they are on disk.
    store.set(atom_workspaceLayout, (prev) => ({
      ...prev,
      rootContainer: removePathsFromLayout(prev.rootContainer, inFolder) as typeof prev.rootContainer,
    }));
    store.set(atom_openFiles, (prev) => {
      const kept = { ...prev };
      for (const path of Object.keys(kept)) if (inFolder(path)) delete kept[path];
      return kept;
    });
    const shown = applyLibrary(libraryOf(primary, next));
    try {
      await saveLibraryMounts(vaultKey, primary, next);
    } catch (err) {
      console.error("Failed to save the library's folders:", err);
      await shown.catch(() => undefined);
      await applyLibrary(libraryOf(primary, mounts));
      toast.error(`Couldn't remove “${name}”.`);
      return false;
    }
    await shown;
    toast.success(`Removed “${name}” from the library. Its files are untouched.`);
    return true;
  }, [store, applyLibrary]);

  // From a click on the locked folder's row: the ask must start before any
  // await, while the click still counts.
  const unlockLibraryFolder = useCallback(async (name: string): Promise<boolean> => {
    const current = store.get(atom_vaultHandle);
    const mount = libraryMounts(current).find((m) => m.name === name);
    if (!current || !mount) return false;
    let granted = false;
    try {
      granted = await requestPermissionFromUserGesture(mount.handle);
    } catch (err) {
      console.warn("Couldn't ask for the folder's access:", err);
    }
    if (!granted) {
      toast.error(`“${name}” stays locked until access is allowed.`);
      return false;
    }
    // The library may have changed while the prompt was open.
    const latest = store.get(atom_vaultHandle);
    const next = libraryMounts(latest).map((m) => (m.name === name ? { ...m, locked: false } : m));
    await applyLibrary(libraryOf(realHandle(latest!), next));
    return true;
  }, [store, applyLibrary]);

  return { addLibraryFolder, removeLibraryFolder, unlockLibraryFolder };
}
