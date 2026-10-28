"use client";

import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { readTagIcons, type TagIcons } from "./tag-icons";

const NONE: TagIcons = {};

// The open vault's tag icons (`.hermes/tags.json`), read when the vault
// opens; the tags show plain # until they're in.
export function useTagIcons(): TagIcons {
  const vault = useAtomValue(atom_vaultHandle);
  const [loaded, setLoaded] = useState<{ vault: FileSystemDirectoryHandle; icons: TagIcons } | null>(null);
  useEffect(() => {
    if (!vault) return;
    let current = true;
    void readTagIcons(vault).then((icons) => {
      if (current) setLoaded({ vault, icons });
    });
    return () => {
      current = false;
    };
  }, [vault]);
  return loaded && loaded.vault === vault ? loaded.icons : NONE;
}
