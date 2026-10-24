"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_noteDisplayItems } from "@/app/atoms/privacy-atoms";
import { atom_vaultTextFiles } from "@/app/atoms/vault-atoms";
import type { FileResult } from "./palette-model";

const isShown = (path: string, showHiddenFiles: boolean) =>
  showHiddenFiles || !path.split("/").some((segment) => segment.startsWith("_"));

// The palette's file list: every indexed file (minus _-prefixed paths unless
// hidden files are shown), filtered through the display items so "hidden"
// Privacy Mode drops private notes from search, #tag, recent and pinned
// rows. `existingFiles` ignores Privacy Mode; it only decides whether the
// "Create '…'" row is offered, so a hidden note's name is never created twice.
// Code and other text files (atom_vaultTextFiles) follow the notes, by name
// with their extension.
export function usePaletteFiles(showHiddenFiles: boolean) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const displayItems = useAtomValue(atom_noteDisplayItems);
  const textFiles = useAtomValue(atom_vaultTextFiles);

  const existingFiles = useMemo<FileResult[]>(
    () => Object.values(fileMetadata)
      .filter((metadata) => isShown(metadata.path, showHiddenFiles))
      .map((metadata): FileResult => ({
        path: metadata.path,
        name: metadata.name,
        handle: metadata.handle as FileSystemFileHandle,
        tags: metadata.tags,
        isPrivate: displayItems.get(metadata.path)?.isPrivate ?? false,
      }))
      .concat(textFiles.filter((file) => isShown(file.path, showHiddenFiles)).map((file) => ({
        path: file.path,
        name: file.path.slice(file.path.lastIndexOf("/") + 1),
        handle: file.handle,
        tags: [],
        isPrivate: false,
        isText: true,
      }))),
    [displayItems, fileMetadata, showHiddenFiles, textFiles],
  );

  const files = useMemo(
    () => existingFiles.filter((file) => file.isText || displayItems.has(file.path)),
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
