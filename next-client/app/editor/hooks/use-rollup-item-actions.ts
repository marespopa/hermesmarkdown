"use client";

import { useEffect } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_pendingScrollTarget } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { useNoteBuffer } from "@/app/hooks/file-system/use-note-buffer";
import { findExisting } from "@/app/hooks/file-system/use-template-create";
import { findSheetByName } from "@/app/utils/today-note";
import { findSourceTask, parseRollupItem } from "@/app/utils/rollup/items";
import { patchLineInContent } from "@/app/utils/taskExtractor";
import { ROLLUP_ITEM_EVENT, type RollupItemRequest } from "../utils/worklog-events";
import { useRollups } from "./use-rollups";
import { useRollupSources } from "./use-rollup-sources";

class TaskGone extends Error {}

// What a rollup item does in the editor (rollup-view.ts, the day links):
// - "toggle" checks its task off in the daily sheet it came from (found by
//   text, through the open tab's buffer when it's open), then refreshes the
//   rollup quietly so the item moves to Done;
// - "open" opens that daily sheet with the caret on the task (the top of the
//   sheet when the task is gone).
export function useRollupItemActions() {
  const store = useStore();
  const { openFile } = useFileSystem();
  const { readCurrentText, writeThrough } = useNoteBuffer();
  const { preferredFolder } = useRollupSources();
  const { refreshRollup } = useRollups();

  useEffect(() => {
    const dayPathOf = (date: string) => {
      const [year, month, day] = date.split("-").map(Number);
      return findSheetByName(Object.keys(store.get(atom_fileMetadata)), `${date}.md`, preferredFolder(new Date(year, month - 1, day)));
    };

    const toggle = async (rollupPath: string, line: string) => {
      const item = parseRollupItem(line);
      const vaultHandle = store.get(atom_vaultHandle);
      const dayPath = item && dayPathOf(item.date);
      if (!item || !vaultHandle || !dayPath) return;
      try {
        const handle = await findExisting(vaultHandle, dayPath);
        if (!handle) throw new TaskGone();
        await writeThrough(dayPath, handle, (text) => {
          const task = findSourceTask(text, item);
          if (!task) throw new TaskGone();
          return task.checked ? null : patchLineInContent(text, task, "done");
        });
      } catch (err) {
        if (err instanceof TaskGone) toast.error(`That task is no longer in ${item.date}`, { id: "rollup-item" });
        else {
          console.warn("Rollup: couldn't check off", err);
          toast.error("Couldn't check off the task", { id: "rollup-item" });
        }
      }
      await refreshRollup(rollupPath, { quiet: true });
    };

    const open = async (line: string) => {
      const item = parseRollupItem(line);
      const vaultHandle = store.get(atom_vaultHandle);
      const dayPath = item && dayPathOf(item.date);
      if (!item || !vaultHandle || !dayPath) return;
      const handle = await findExisting(vaultHandle, dayPath).catch(() => null);
      if (!handle) return;
      const task = findSourceTask(await readCurrentText(dayPath).catch(() => ""), item);
      await openFile(handle, dayPath, true);
      if (task) store.set(atom_pendingScrollTarget, { path: dayPath, line: task.line + 1 });
    };

    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent<RollupItemRequest>).detail;
      if (!detail) return;
      if (detail.action === "toggle") void toggle(detail.path, detail.line);
      else void open(detail.line);
    };
    document.addEventListener(ROLLUP_ITEM_EVENT, onRequest);
    return () => document.removeEventListener(ROLLUP_ITEM_EVENT, onRequest);
  }, [store, openFile, readCurrentText, writeThrough, preferredFolder, refreshRollup]);
}
