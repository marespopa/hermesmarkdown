"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultFiles, atom_vaultFolderPaths, atom_vaultKey, atom_vaultTextFiles } from "@/app/atoms/vault-atoms";
import { atom_vaultTreeListedKey, atom_vaultTreeSnapshot } from "@/app/atoms/tree-snapshot-atoms";
import { isImagePath, isPlainTextPath } from "@/app/utils/file-kinds";
import { atom_pendingTreePaths } from "@/app/atoms/pending-tree-atoms";
import { atom_showHiddenFiles } from "@/app/atoms/ui-atoms";

// Which view is searching: "files" (the Files page, the sidebar's Files
// section) shows the full tree; "search" caps the results at a short list.
export type FileSearchView = "files" | "search";

interface UseVaultFileSearchProps {
  selectedTags: string[];
  panel: FileSearchView;
  /** The sidebar's tree: fill in the rows not found yet from the tree as last seen. */
  rememberedTree?: boolean;
}

const MAX_SEARCH_RESULTS = 6;

export function useVaultFileSearch({ selectedTags, panel, rememberedTree = false }: UseVaultFileSearchProps) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const vaultFiles = useAtomValue(atom_vaultFiles);
  const walkedFolderPaths = useAtomValue(atom_vaultFolderPaths);
  const textFiles = useAtomValue(atom_vaultTextFiles);
  const showHiddenFiles = useAtomValue(atom_showHiddenFiles);
  const [searchQuery, setSearchQuery] = useState("");

  const vaultTags = useMemo(() => {
    const tagsMap: Record<string, any[]> = {};
    Object.values(fileMetadata).forEach((meta) => {
      meta.tags.forEach((tag) => {
        if (!tagsMap[tag]) tagsMap[tag] = [];
        tagsMap[tag].push(meta);
      });
    });
    return tagsMap;
  }, [fileMetadata]);

  const tags = useMemo(() =>
    Object.keys(vaultTags).sort((a, b) => a < b ? -1 : a > b ? 1 : 0),
  [vaultTags]);

  const tagCounts = useMemo(() =>
    Object.fromEntries(Object.entries(vaultTags).map(([tag, files]) => [tag, files.length])),
  [vaultTags]);

  // "Show Hidden Files" reveals everything a user might want to audit —
  // dotfiles (already handled upstream, before files ever reach fileMetadata)
  // and underscore-prefixed skill/meta files alike. Nothing should be
  // permanently un-revealable, so trust in what's actually in the vault
  // isn't undermined by files a user has no in-app way to see.
  const isHiddenPath = useCallback((path: string) =>
    !showHiddenFiles && path.split("/").some((segment) => segment.startsWith("_")),
  [showHiddenFiles]);

  // Non-.md files (index.yaml, schema.yaml, etc.) only ever reach fileMetadata
  // from .hermesmarkdown/ while hidden files are shown (see collectVaultFiles), so
  // let those through too rather than assuming every entry is markdown.
  const isVisibleFile = useCallback((path: string) =>
    path.endsWith(".md") || isPlainTextPath(path) || isImagePath(path) || (showHiddenFiles && path.startsWith(".hermesmarkdown/")),
  [showHiddenFiles]);

  // Unfiltered — every visible file in the vault, ignoring search/tag filters.
  // Used by the file views (Files, the folder popover), which list the notes
  // and the vault's other text files (never indexed, so from their own walk
  // list, atom_vaultTextFiles).
  const foundFiles = useMemo(() => {
    const hasMetadata = Object.keys(fileMetadata).length > 0 || textFiles.length > 0;

    if (hasMetadata) {
      // Text files come from their own list only, once each.
      const notes = Object.values(fileMetadata)
        .filter((m) => isVisibleFile(m.path) && !isPlainTextPath(m.path) && !isImagePath(m.path) && !isHiddenPath(m.path))
        .map((m) => ({ name: m.name, kind: "file" as const, handle: m.handle, path: m.path }));
      const others = textFiles
        .filter((f) => !isHiddenPath(f.path))
        .map((f) => ({ name: f.handle.name, kind: "file" as const, handle: f.handle, path: f.path }));
      return [...notes, ...others].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Fallback: vaultFiles (immediate, from scanVault) — used while indexVaultTags is still running
    return vaultFiles
      .filter((f: any) => f.kind === "file" && isVisibleFile((f as any).path || f.name) && !isHiddenPath((f as any).path || f.name))
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((f: any) => ({ name: f.name, kind: "file" as const, handle: f as FileSystemFileHandle, path: (f as any).path || f.name }));
  }, [fileMetadata, textFiles, vaultFiles, isHiddenPath, isVisibleFile]);

  // On startup, until the vault's walk has listed every file, the tree as
  // last seen fills in the rows not found yet (tree-snapshot-atoms.ts). Its
  // rows have no handle (opened by path), sit where the found ones will,
  // and the ones gone from the vault drop out when the walk is over.
  const vaultKey = useAtomValue(atom_vaultKey);
  const snapshot = useAtomValue(atom_vaultTreeSnapshot);
  const listedKey = useAtomValue(atom_vaultTreeListedKey);
  const treeSnapshot = rememberedTree && snapshot && snapshot.vaultKey === vaultKey && listedKey !== vaultKey ? snapshot : null;
  // Files being created (a folder template, pending-tree-atoms.ts) show the
  // same way, whether or not a snapshot is in use.
  const pending = useAtomValue(atom_pendingTreePaths);
  const allFiles = useMemo(() => {
    if (!treeSnapshot && pending.files.size === 0) return foundFiles;
    const found = new Set(foundFiles.map((file) => file.path));
    const extra = [...(treeSnapshot?.files ?? []), ...pending.files];
    const remembered = [...new Set(extra)]
      .filter((path) => !found.has(path) && isVisibleFile(path) && !isHiddenPath(path))
      .map((path) => ({ name: path.split("/").pop() || path, kind: "file" as const, handle: null as FileSystemFileHandle | null, path }));
    return [...foundFiles, ...remembered].sort((a, b) => a.name.localeCompare(b.name));
  }, [foundFiles, treeSnapshot, pending, isVisibleFile, isHiddenPath]);

  // Metadata only indexes files, so folders come from the indexing walk
  // (every depth) plus the latest directory listing (a folder created since),
  // which lets empty folders remain visible in the Files tree.
  const folderPaths = useMemo(() => {
    const listed = (Array.isArray(vaultFiles) ? vaultFiles : [])
      .filter((entry: any) => entry.kind === "directory")
      .map((entry: any) => (entry.path || entry.name) as string);
    return [...new Set([...walkedFolderPaths, ...listed, ...(treeSnapshot?.folders ?? []), ...pending.folders])].filter((path) =>
      (showHiddenFiles || !path.split("/").some((segment) => segment.startsWith("."))) &&
      !isHiddenPath(path),
    );
  }, [vaultFiles, walkedFolderPaths, treeSnapshot, pending, showHiddenFiles, isHiddenPath]);

  const [showAllResults, setShowAllResults] = useState(false);

  useEffect(() => {
    setShowAllResults(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedTags.join(","), panel]);

  const matchedFiles = useMemo(() => {
    const hasMetadata = Object.keys(fileMetadata).length > 0;

    // Tag filters use AND logic. When text is also present, it narrows the
    // tagged results rather than replacing the tag query.
    if (selectedTags.length > 0) {
      const q = searchQuery.toLowerCase().trim();
      return Object.values(fileMetadata)
        .filter((m) =>
          isVisibleFile(m.path) &&
          !isHiddenPath(m.path) &&
          selectedTags.every((tag) => m.tags.includes(tag)) &&
          (!q || m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q)),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => ({ name: m.name, kind: "file" as const, handle: m.handle, path: m.path }));
    }

    // Search: use metadata for full-vault recursive search; fall back to vaultFiles if not yet indexed
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      if (hasMetadata) {
        return Object.values(fileMetadata)
          .filter((m) => isVisibleFile(m.path) && !isHiddenPath(m.path) && (m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q)))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((m) => ({ name: m.name, kind: "file" as const, handle: m.handle, path: m.path }));
      }
      return vaultFiles
        .filter((f: any) => f.kind === "file" && isVisibleFile((f as any).path || f.name) && !isHiddenPath((f as any).path || f.name) && f.name.toLowerCase().includes(q))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((f: any) => ({ name: f.name, kind: "file" as const, handle: f as FileSystemFileHandle, path: (f as any).path || f.name }));
    }

    return allFiles;
  }, [fileMetadata, vaultFiles, selectedTags, searchQuery, allFiles, isHiddenPath, isVisibleFile]);

  const processedFiles = showAllResults
    ? matchedFiles
    : matchedFiles.slice(0, MAX_SEARCH_RESULTS);

  const hasMoreResults = !showAllResults && matchedFiles.length > MAX_SEARCH_RESULTS;

  return {
    searchQuery,
    setSearchQuery,
    processedFiles,
    totalResultsCount: matchedFiles.length,
    hasMoreResults,
    showAllResults,
    setShowAllResults,
    allFiles,
    folderPaths,
    tags,
    tagCounts,
  };
}
