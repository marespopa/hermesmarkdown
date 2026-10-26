"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_showHiddenFiles } from "@/app/atoms/ui-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { isPathInLayout } from "@/app/atoms/utils";
import { usePaletteFiles } from "@/app/components/CommandPalette/use-palette-files";
import { isTrashPath } from "@/app/services/vault-trash";
import type { GrepFile } from "@/app/workers/text-grep-protocol";

// The files Replace in Files looks in: the palette's file list (so `_` paths
// follow the hidden-files setting) minus private notes and the Trash, minus
// code and other text files unless `includeCode`. An open tab with unsaved
// edits is sent as its text, since that's what a write would act on.
export function useReplaceFiles(includeCode: boolean): { files: GrepFile[]; hasPrivate: boolean } {
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const { files: paletteFiles } = usePaletteFiles(showHiddenFiles);
  const openFiles = useAtomValue(atom_openFiles);
  const layout = useAtomValue(atom_workspaceLayout);

  return useMemo(() => {
    const files: GrepFile[] = [];
    let hasPrivate = false;
    for (const file of paletteFiles) {
      if (file.isPrivate) {
        hasPrivate = true;
        continue;
      }
      if (isTrashPath(file.path) || (file.isText && !includeCode)) continue;
      const tab = openFiles[file.path];
      const dirty = tab && tab.content !== tab.lastSavedContent && isPathInLayout(layout.rootContainer, file.path);
      files.push({
        path: file.path,
        name: file.name,
        handle: file.handle,
        ...(file.isText ? {} : { isNote: true }),
        ...(dirty ? { content: tab.content } : {}),
      });
    }
    return { files, hasPrivate };
  }, [paletteFiles, includeCode, openFiles, layout]);
}
