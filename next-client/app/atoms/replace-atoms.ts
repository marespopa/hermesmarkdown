import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ReplaceOptions } from "@/app/workers/replace-search";

// Replace in Files (app/editor/replace/): the options it remembers, and the
// last replace, kept for Undo.

export interface ReplacePrefs extends ReplaceOptions {
  /** Also search and replace in code and other text files. */
  includeCode: boolean;
}

export const atom_replacePrefs = atomWithStorage<ReplacePrefs>("hermes_replace_options", {
  matchCase: false,
  wholeWord: false,
  regex: false,
  includeCode: false,
});

export interface LastReplace {
  /** The vault it happened in; ignored (and cleared) once another vault is open. */
  vault: FileSystemDirectoryHandle;
  matches: number;
  /** Per replaced file: its text before, and the fingerprint of what the replace wrote. */
  files: { path: string; before: string; afterFingerprint: string }[];
}

// Session only: it holds the previous text of every replaced file.
export const atom_lastReplace = atom<LastReplace | null>(null);
