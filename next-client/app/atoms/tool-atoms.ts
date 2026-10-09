import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { tabSessionStorage } from "./session-storage";

// Work on the free tool pages (/tools/*). Kept in the tab's sessionStorage,
// so a refresh, or Back from the editor, restores it and a new tab starts
// fresh. Tool code imports this file directly, never the `atoms.ts` barrel,
// so the workspace atoms stay out of the tool pages' bundles.

// null means never edited: the tool shows its first example. Cleared text
// stays cleared.
export const atom_tokenizerText = atomWithStorage<string | null>(
  "hermes_tool_tokenizer",
  null,
  createJSONStorage<string | null>(tabSessionStorage),
  { getOnInit: true },
);

export type TokenizerEncoding = "o200k_base" | "cl100k_base";

export const atom_tokenizerEncoding = atomWithStorage<TokenizerEncoding>(
  "hermes_tool_tokenizer_encoding",
  "o200k_base",
  createJSONStorage<TokenizerEncoding>(tabSessionStorage),
  { getOnInit: true },
);

// The table generator's document (Markdown); null until edited, which shows
// an empty 3 × 2 table.
export const atom_tableToolMarkdown = atomWithStorage<string | null>(
  "hermes_tool_table",
  null,
  createJSONStorage<string | null>(tabSessionStorage),
  { getOnInit: true },
);
