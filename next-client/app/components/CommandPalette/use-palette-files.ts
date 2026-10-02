"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_noteDisplayItems } from "@/app/atoms/privacy-atoms";
import type { FileResult } from "./palette-model";

// The palette's file list: every indexed file (minus _-prefixed paths unless
// hidden files are shown), filtered through the display items so "hidden"
// Privacy Mode drops sensitive notes from search, #tag, recent and pinned
// rows. `existingFiles` ignores Privacy Mode; it only decides whether the
// "Create '…'" row is offered, so a hidden note's name is never created twice.
export function usePaletteFiles(showHiddenFiles: boolean) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const displayItems = useAtomValue(atom_noteDisplayItems);

  const existingFiles = useMemo<FileResult[]>(
    () => Object.values(fileMetadata)
      .filter((metadata) => showHiddenFiles || !metadata.path.split("/").some((segment) => segment.startsWith("_")))
      .map((metadata) => ({
        path: metadata.path,
        name: metadata.name,
        handle: metadata.handle as FileSystemFileHandle,
        tags: metadata.tags,
        isSensitive: displayItems.get(metadata.path)?.isSensitive ?? false,
      })),
    [displayItems, fileMetadata, showHiddenFiles],
  );

  const files = useMemo(
    () => existingFiles.filter((file) => displayItems.has(file.path)),
    [displayItems, existingFiles],
  );

  const filesByTag = useMemo(() => {
    const indexedFiles = new Map<string, FileResult[]>();
    files.forEach((file) => file.tags.forEach((rawTag) => {
      const tag = rawTag.replace(/^#/, "").trim().toLowerCase();
      if (!tag) return;
      const taggedFiles = indexedFiles.get(tag);
      if (taggedFiles) taggedFiles.push(file);
      else indexedFiles.set(tag, [file]);
    }));
    return indexedFiles;
  }, [files]);

  return { files, filesByTag, existingFiles };
}
