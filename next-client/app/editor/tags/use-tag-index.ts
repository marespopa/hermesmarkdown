"use client";

import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { atom_noteDisplayItems } from "@/app/atoms/privacy-atoms";
import { buildTagIndex, type TagIndex } from "./tag-index";

// The vault's tags, nested tree and system-filter counts, as the Tags page
// and the mobile drawer's Tags tab show them.
export function useTagIndex(): TagIndex {
  const metadata = useAtomValue(atom_fileMetadata);
  const displayItems = useAtomValue(atom_noteDisplayItems);
  return useMemo(() => buildTagIndex(metadata, displayItems), [metadata, displayItems]);
}
