"use client";

import { useAtomValue } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_openFiles, atom_fileContent } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { isPathInLayout } from "@/app/atoms/utils";
import { useSaveFile } from "@/app/hooks/file-system/use-save-file";
import { TaskItem, patchLineInContent } from "@/app/utils/taskExtractor";
import { contentStore } from "@/app/atoms/atoms";
import { toggledStatus, type TaskStatus } from "@/app/utils/task-status";

export function useTaskWriteback() {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const { saveFile } = useSaveFile();

  const setTaskStatus = useCallback(
    async (task: TaskItem, status: TaskStatus) => {
      if (task.status === status) return;
      const meta = fileMetadata[task.path];
      const handle = meta?.handle;
      if (!handle) {
        toast.error("Couldn't locate the source file for this task.");
        return;
      }

      const layout = contentStore.get(atom_workspaceLayout);
      const openFiles = contentStore.get(atom_openFiles);
      const open = isPathInLayout(layout.rootContainer, task.path) && task.path in openFiles;

      const currentContent = open
        ? contentStore.get(atom_fileContent(task.path))
        : await (await handle.getFile()).text();

      const patched = patchLineInContent(currentContent, task, status);
      if (patched === null) {
        toast.error("This task's line changed since it was last scanned — refresh and try again.");
        return;
      }

      if (open) {
        contentStore.set(atom_fileContent(task.path), patched);
      }

      // saveFile() re-derives this file's `.tasks` from `patched` on write,
      // so the Tasks view updates immediately without a separate patch here.
      await saveFile(patched, handle, 0, false, task.path);
    },
    [fileMetadata, saveFile],
  );

  // A click on the box: open → done, done or cancelled → to do.
  const toggleTask = useCallback(
    (task: TaskItem) => setTaskStatus(task, toggledStatus(task.status)),
    [setTaskStatus],
  );

  return { toggleTask, setTaskStatus };
}
