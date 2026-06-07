"use client";

import { useState, useMemo } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_vaultFiles } from "@/app/atoms/vault-atoms";

interface UseSidebarSearchProps {
  selectedTags: string[];
}

export function useSidebarSearch({ selectedTags }: UseSidebarSearchProps) {
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

  const processedFiles = useMemo(() => {
    const hasMetadata = Object.keys(fileMetadata).length > 0;

    // Tag filter: .md files matching ALL selected tags (AND logic) — always from metadata
    if (selectedTags.length > 0) {
      return Object.values(fileMetadata)
        .filter((m) => m.name.endsWith(".md") && selectedTags.every(t => m.tags.includes(t)))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => ({ name: m.name, kind: "file" as const, handle: m.handle, path: m.path }));
    }

    // Search: use metadata for full-vault recursive search; fall back to vaultFiles if not yet indexed
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      if (hasMetadata) {
        return Object.values(fileMetadata)
          .filter((m) => m.name.endsWith(".md") && (m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q)))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((m) => ({ name: m.name, kind: "file" as const, handle: m.handle, path: m.path }));
      }
      return vaultFiles
        .filter((f: any) => f.kind === "file" && f.name.endsWith(".md") && f.name.toLowerCase().includes(q))
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
        .map((f: any) => ({ name: f.name, kind: "file" as const, handle: f as FileSystemFileHandle, path: (f as any).path || f.name }));
    }

    // Default: prefer metadata (has recursive results + tags); fall back to vaultFiles while indexing
    if (hasMetadata) {
      return Object.values(fileMetadata)
        .filter((m) => m.name.endsWith(".md"))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((m) => ({ name: m.name, kind: "file" as const, handle: m.handle, path: m.path }));
    }

    // Fallback: vaultFiles (immediate, from scanVault) — used while indexVaultTags is still running
    return vaultFiles
      .filter((f: any) => f.kind === "file" && f.name.endsWith(".md"))
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((f: any) => ({ name: f.name, kind: "file" as const, handle: f as FileSystemFileHandle, path: (f as any).path || f.name }));
  }, [fileMetadata, vaultFiles, selectedTags, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    processedFiles,
    tags,
  };
}
