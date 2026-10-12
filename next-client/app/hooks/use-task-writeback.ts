"use client";

import { useAtomValue } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_openFiles, atom_fileContent } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { isPathInLayout } from "@/app/atoms/utils";
import { useSaveFile } from "@/app/hooks/file-system/use-save-file";
import { REGEX_TASK_LINE, TaskItem, replaceTaskLine, simpleHash, type TaskLineRef } from "@/app/utils/taskExtractor";
import { contentStore } from "@/app/atoms/atoms";
import { toggledStatus, type TaskStatus } from "@/app/utils/task-status";
import { withTaskStatus } from "@/app/utils/task-line";

// A task line as it was rewritten: where it is and its text before and
// after, enough to put it back (restoreTaskLine) without waiting for a rescan.
export interface TaskLineChange {
  path: string;
  line: number;
  before: string;
  after: string;
}

export function useTaskWriteback() {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const { saveFile } = useSaveFile();

  // Rewrites one task line in its file (the open tab's text when the note is
  // open, else the file on disk) and saves it.
  const writeTaskLine = useCallback(
    async (path: string, task: TaskLineRef, next: (line: string) => string): Promise<TaskLineChange | null> => {
      const handle = fileMetadata[path]?.handle;
      if (!handle) {
        toast.error("Couldn't locate the source file for this task.");
        return null;
      }

      const layout = contentStore.get(atom_workspaceLayout);
      const openFiles = contentStore.get(atom_openFiles);
      const open = isPathInLayout(layout.rootContainer, path) && path in openFiles;

      const currentContent = open
        ? contentStore.get(atom_fileContent(path))
        : await (await handle.getFile()).text();

      const patched = replaceTaskLine(currentContent, task, next);
      if (patched === null) {
        toast.error("This task's line changed since it was last scanned — refresh and try again.");
        return null;
      }

      if (open) {
        contentStore.set(atom_fileContent(path), patched.content);
      }

      // saveFile() re-derives this file's `.tasks` from the new text on
      // write, so the Tasks view updates immediately without a separate patch.
      await saveFile(patched.content, handle, 0, false, path);
      return { path, line: patched.line, before: patched.before, after: patched.after };
    },
    [fileMetadata, saveFile],
  );

  const setTaskStatus = useCallback(
    async (task: TaskItem, status: TaskStatus): Promise<TaskLineChange | null> => {
      if (task.status === status) return null;
      return writeTaskLine(task.path, task, (line) => (REGEX_TASK_LINE.test(line) ? withTaskStatus(line, status) : line));
    },
    [writeTaskLine],
  );

  // A click on the box: open → done, done or cancelled → to do.
  const toggleTask = useCallback(
    (task: TaskItem) => setTaskStatus(task, toggledStatus(task.status)),
    [setTaskStatus],
  );

  // Undo: puts a changed line back exactly as it was, stamps included.
  const restoreTaskLine = useCallback(
    (change: TaskLineChange) =>
      writeTaskLine(
        change.path,
        { line: change.line, raw: change.after, lineHash: simpleHash(change.after) },
        () => change.before,
      ),
    [writeTaskLine],
  );

  return { toggleTask, setTaskStatus, restoreTaskLine };
}
