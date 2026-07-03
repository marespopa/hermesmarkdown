"use client";

import { useAtomValue } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_openFiles, atom_fileContent } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { WorkspaceContainer, PanelLeaf } from "@/app/types/workspace";
import { useSaveFile } from "@/app/hooks/file-system/use-save-file";
import { TaskItem, patchLineInContent } from "@/app/utils/taskExtractor";
import { contentStore } from "@/app/atoms/atoms";

function isPathOpen(node: WorkspaceContainer | PanelLeaf, path: string): boolean {
  if ("type" in node) return node.openFilePaths.includes(path);
  return node.children.some((child) => isPathOpen(child, path));
}

export function useTaskWriteback() {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const { saveFile } = useSaveFile();

  const toggleTask = useCallback(
    async (task: TaskItem) => {
      const meta = fileMetadata[task.path];
      const handle = meta?.handle;
      if (!handle) {
        toast.error("Couldn't locate the source file for this task.");
        return;
      }

      const layout = contentStore.get(atom_workspaceLayout);
      const openFiles = contentStore.get(atom_openFiles);
      const open = isPathOpen(layout.rootContainer, task.path) && task.path in openFiles;

      const currentContent = open
        ? contentStore.get(atom_fileContent(task.path))
        : await (await handle.getFile()).text();

      const patched = patchLineInContent(currentContent, task);
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

  return { toggleTask };
}
