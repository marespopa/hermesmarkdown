"use client";

import { useCallback, useRef } from "react";
import { useAtomValue, useStore } from "jotai";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { atom_jotTimePrefix } from "@/app/atoms/ui-atoms";
import { isPathInLayout } from "@/app/atoms/utils";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useSaveFile } from "@/app/hooks/file-system/use-save-file";
import { reconcileWithDisk } from "@/app/hooks/file-system/reconcile-disk";
import { appendJotLine, formatJotLine } from "@/app/utils/quick-jot";

export type JotResult = "added" | "cancelled" | "failed";
export interface JotOutcome {
  result: JotResult;
  // Today's sheet base name (`2026-10-10`) on success.
  sheetName?: string;
  // On failure: the jot is already in the open tab's buffer, so the next
  // autosave writes it and the input must not offer it again.
  keptInBuffer?: boolean;
}

// Appends one line to the end of today's sheet, creating the sheet (without
// opening it) when needed. A sheet open in a tab is reconciled with disk
// first (disk wins), then gets the jot in its buffer and is saved with any
// unsaved edits, so a visible editor updates live with no conflict. A sheet
// that isn't open is written straight to disk. Jots run one at a time.
export function useQuickJot() {
  const store = useStore();
  const { ensureTodayNote, indexVaultTags } = useFileSystem();
  const { saveFile } = useSaveFile();
  const timePrefix = useAtomValue(atom_jotTimePrefix);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const run = useCallback(async (text: string, now: Date): Promise<JotOutcome> => {
    const line = formatJotLine(text, timePrefix ? now : null);
    if (line === null) return { result: "cancelled" };
    let inBuffer = false;
    try {
      const sheet = await ensureTodayNote(now);
      if (!sheet) return { result: "cancelled" };
      const { path, handle } = sheet;
      const file = await handle.getFile();
      const disk = await file.text();
      const openFiles = store.get(atom_openFiles);
      const state = openFiles[path];
      const open = isPathInLayout(store.get(atom_workspaceLayout).rootContainer, path) && !!state;
      let next: string;
      if (open) {
        const reconciled = reconcileWithDisk(state, disk, file.lastModified);
        next = appendJotLine(reconciled.content, line);
        store.set(atom_openFiles, { ...openFiles, [path]: { ...reconciled, content: next } });
        inBuffer = true;
      } else {
        next = appendJotLine(disk, line);
      }
      const ok = await saveFile(next, handle, 0, true, path);
      void indexVaultTags().catch((err) => console.warn("Quick jot: reindex failed", err));
      if (!ok) return { result: "failed", keptInBuffer: inBuffer };
      const sheetName = (path.split("/").pop() ?? path).replace(/\.md$/i, "");
      return { result: "added", sheetName };
    } catch (err) {
      console.warn("Quick jot failed:", err);
      return { result: "failed", keptInBuffer: inBuffer };
    }
  }, [store, ensureTodayNote, indexVaultTags, saveFile, timePrefix]);

  const addJot = useCallback((text: string, now: Date = new Date()): Promise<JotOutcome> => {
    const result = queue.current.then(() => run(text, now));
    queue.current = result.catch(() => undefined);
    return result;
  }, [run]);

  return { addJot };
}
