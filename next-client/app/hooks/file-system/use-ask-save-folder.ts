"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { atom_vaultFolderPaths, atom_vaultHandle, atom_vaultName } from "@/app/atoms/vault-atoms";
import { atom_lastSaveFolder } from "@/app/atoms/ui-atoms";
import { useDialog } from "../use-dialog";

const ROOT_VALUE = "__root__";
const PATH_PREFIX = "path:";
const isHiddenSegment = (path: string) => path.split("/").some((s) => s.startsWith("_") || s.startsWith("."));

// The one question asked before a new file is written: which vault folder it
// goes in. Lists the vault root and every visible folder, the one picked last
// time first. Resolves to the vault-relative folder ("" = root), or null when
// cancelled; the choice is remembered for the next question.
export function useAskSaveFolder() {
  const store = useStore();
  // `select` is stable; the object useDialog returns is new on every render.
  const { select } = useDialog();

  return useCallback(async (title: string): Promise<string | null> => {
    const vault = store.get(atom_vaultHandle);
    if (!vault) return null;
    const vaultName = store.get(atom_vaultName) ?? vault.name;
    const folders = store.get(atom_vaultFolderPaths)
      .filter((path) => !isHiddenSegment(path))
      .sort((a, b) => a.localeCompare(b));
    const options = [
      { label: `/ ${vaultName} (root)`, value: ROOT_VALUE },
      ...folders.map((path) => ({ label: path, value: `${PATH_PREFIX}${path}` })),
    ];
    const last = store.get(atom_lastSaveFolder);
    const lastIndex = options.findIndex((option) => option.value === `${PATH_PREFIX}${last}`);
    if (lastIndex > 0) options.unshift(...options.splice(lastIndex, 1));

    const chosen = await select("Choose a folder:", options, title);
    if (!chosen) return null;
    const folder = chosen === ROOT_VALUE ? "" : String(chosen).slice(PATH_PREFIX.length);
    store.set(atom_lastSaveFolder, folder);
    return folder;
  }, [store, select]);
}
