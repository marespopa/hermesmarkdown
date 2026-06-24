"use client";

import { useState, useMemo, useEffect } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultFiles } from "@/app/atoms/vault-atoms";
import { RailPanel } from "@/app/atoms/ui-atoms";

interface UseSidebarSearchProps {
  selectedTags: string[];
  panel: RailPanel;
}

const MAX_SEARCH_RESULTS = 6;

export function useSidebarSearch({ selectedTags, panel }: UseSidebarSearchProps) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const vaultFiles = useAtomValue(atom_vaultFiles);
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

  const isHiddenPath = (path: string) =>
    path.split("/").some((segment) => segment.startsWith("_"));

  // Unfiltered — every .md file in the vault, ignoring search/tag filters.
  // Used by the Files panel, which always shows the full tree.
  const allFiles = useMemo(() => {
    const hasMetadata = Object.keys(fileMetadata).length > 0;

    if (hasMetadata) {
      return Object.values(fileMetadata)
        .filter((m) => m.name.endsWith(".md") && !isHiddenPath(m.path))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => ({ name: m.name, kind: "file" as const, handle: m.handle, path: m.path }));
    }

    // Fallback: vaultFiles (immediate, from scanVault) — used while indexVaultTags is still running
    return vaultFiles
      .filter((f: any) => f.kind === "file" && f.name.endsWith(".md") && !isHiddenPath((f as any).path || f.name))
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((f: any) => ({ name: f.name, kind: "file" as const, handle: f as FileSystemFileHandle, path: (f as any).path || f.name }));
  }, [fileMetadata, vaultFiles]);

  const [showAllResults, setShowAllResults] = useState(false);

  useEffect(() => {
    setShowAllResults(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedTags.join(","), panel]);

  const matchedFiles = useMemo(() => {
    const hasMetadata = Object.keys(fileMetadata).length > 0;

    // Tag filter: .md files matching ALL selected tags (AND logic) — always from metadata
    if (selectedTags.length > 0) {
      return Object.values(fileMetadata)
        .filter((m) => m.name.endsWith(".md") && !isHiddenPath(m.path) && selectedTags.every(t => m.tags.includes(t)))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => ({ name: m.name, kind: "file" as const, handle: m.handle, path: m.path }));
    }

    // Search: use metadata for full-vault recursive search; fall back to vaultFiles if not yet indexed
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      if (hasMetadata) {
        return Object.values(fileMetadata)
          .filter((m) => m.name.endsWith(".md") && !isHiddenPath(m.path) && (m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q)))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((m) => ({ name: m.name, kind: "file" as const, handle: m.handle, path: m.path }));
      }
      return vaultFiles
        .filter((f: any) => f.kind === "file" && f.name.endsWith(".md") && !isHiddenPath((f as any).path || f.name) && f.name.toLowerCase().includes(q))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((f: any) => ({ name: f.name, kind: "file" as const, handle: f as FileSystemFileHandle, path: (f as any).path || f.name }));
    }

    return allFiles;
  }, [fileMetadata, vaultFiles, selectedTags, searchQuery, allFiles]);

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
    tags,
    tagCounts,
  };
}
