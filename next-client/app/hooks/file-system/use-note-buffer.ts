"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { atom_vaultHandle, resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { isPathInLayout } from "@/app/atoms/utils";
import { useSaveFile } from "./use-save-file";
import { reconcileWithDisk } from "./reconcile-disk";

export interface WriteThroughResult {
  result: "written" | "unchanged" | "failed";
  // The new text is already in an open tab's buffer, so the next autosave
  // writes it even when this save failed.
  inBuffer: boolean;
}

// Reads and writes a note that may be open in a tab, with disk winning
// (AI Chat's add to today). "Open" means a tab in the layout with cached
// state. An open tab is reconciled with disk first: unsaved edits survive
// only on an unchanged disk file, otherwise disk wins and the browser text
// becomes a snapshot. No conflict prompt is ever shown.
export function useNoteBuffer() {
  const store = useStore();
  const { saveFile } = useSaveFile();

  const openState = useCallback((path: string) => {
    const state = store.get(atom_openFiles)[path];
    return state && isPathInLayout(store.get(atom_workspaceLayout).rootContainer, path) ? state : null;
  }, [store]);

  const readDisk = useCallback(async (path: string, handle?: FileSystemFileHandle) => {
    let fileHandle = handle;
    if (!fileHandle) {
      const vaultHandle = store.get(atom_vaultHandle);
      if (!vaultHandle) throw new Error("No vault open");
      fileHandle = await resolveFileHandleAtPath(vaultHandle, path);
    }
    const file = await fileHandle.getFile();
    return { text: await file.text(), modified: file.lastModified };
  }, [store]);

  // The note's text as its tab would show it after reconciling (disk text
  // for a closed note). The tab itself isn't changed.
  const readCurrentText = useCallback(async (path: string, handle?: FileSystemFileHandle): Promise<string> => {
    const disk = await readDisk(path, handle);
    const state = openState(path);
    return state ? reconcileWithDisk(state, disk.text, disk.modified).content : disk.text;
  }, [readDisk, openState]);

  // Reconciles an open tab with disk, applies `transform`, puts the result
  // in the tab's buffer (when open) and saves it with any unsaved edits as
  // an autosave. A null from `transform` writes nothing ("unchanged"). Read
  // errors and throws from `transform` propagate; a failed save is "failed".
  const writeThrough = useCallback(async (
    path: string,
    handle: FileSystemFileHandle,
    transform: (text: string) => string | null,
  ): Promise<WriteThroughResult> => {
    const disk = await readDisk(path, handle);
    const state = openState(path);
    const reconciled = state ? reconcileWithDisk(state, disk.text, disk.modified) : null;
    const next = transform(reconciled ? reconciled.content : disk.text);
    if (next === null) return { result: "unchanged", inBuffer: false };
    let inBuffer = false;
    if (reconciled) {
      store.set(atom_openFiles, (prev) => ({ ...prev, [path]: { ...reconciled, content: next } }));
      inBuffer = true;
    }
    try {
      const ok = await saveFile(next, handle, 0, true, path);
      return { result: ok ? "written" : "failed", inBuffer };
    } catch (err) {
      console.warn("Write failed:", err);
      return { result: "failed", inBuffer };
    }
  }, [store, saveFile, readDisk, openState]);

  return { readCurrentText, writeThrough };
}
