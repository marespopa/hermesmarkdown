"use client";

import { useState, useMemo } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";

interface UseSidebarSearchProps {
  vaultFiles: any[];
  selectedTag: string | null;
}

export function useSidebarSearch({ vaultFiles, selectedTag }: UseSidebarSearchProps) {
  const fileMetadata = useAtomValue(atom_fileMetadata);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagSearchQuery, setTagSearchQuery] = useState("");

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

  const filteredFiles = selectedTag ? vaultTags[selectedTag] : null;

  const processedTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return tags;
    const query = tagSearchQuery.toLowerCase().trim();
    return tags.filter(tag => tag.toLowerCase().includes(query));
  }, [tags, tagSearchQuery]);

  const processedFiles = useMemo(() => {
    // Global search across all indexed files if searching and not in tag view
    if (!selectedTag && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // 1. Get matching files from global metadata
      const globalMatches = Object.values(fileMetadata)
        .filter(meta => 
          meta.name.toLowerCase().includes(query) || 
          meta.path.toLowerCase().includes(query)
        )
        .map(meta => ({
          name: meta.name,
          kind: "file" as const,
          handle: meta.handle,
          path: meta.path
        }));

      // 2. Get matching folders from current directory (vaultFiles)
      const folderMatches = vaultFiles
        .filter(entry => 
          entry.kind === "directory" && 
          entry.name.toLowerCase().includes(query)
        )
        .map(entry => ({
          name: entry.name,
          kind: "directory" as const,
          handle: entry as FileSystemDirectoryHandle,
        }));

      // Combine and sort
      return [...folderMatches, ...globalMatches].sort((a, b) => {
        if (a.kind === "directory" && b.kind === "file") return -1;
        if (a.kind === "file" && b.kind === "directory") return 1;
        return a.name.localeCompare(b.name);
      });
    }

    const files = selectedTag ? filteredFiles : vaultFiles;
    if (!files) return [];

    // Sort: Folders first, then alphabetical by name
    let result = [...files].sort((a: any, b: any) => {
      const aIsFolder = a.kind === "directory";
      const bIsFolder = b.kind === "directory";
      
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      
      return a.name.localeCompare(b.name);
    });

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((file: any) => 
        file.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [selectedTag, filteredFiles, vaultFiles, searchQuery, fileMetadata]);

  return {
    searchQuery,
    setSearchQuery,
    tagSearchQuery,
    setTagSearchQuery,
    processedTags,
    processedFiles,
    tags,
  };
}
