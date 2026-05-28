import { createStore, atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const contentStore = createStore();

// Theme & appearance
export const atom_theme = atomWithStorage<"light" | "dark">("theme", "light");
export const atom_wordWrap = atomWithStorage<boolean>("wordWrap", true);
export const atom_fontFamily = atomWithStorage<string>(
  "editorFontFamily",
  "var(--font-jetbrains), monospace",
);
export const atom_fontSize = atomWithStorage<string>(
  "editorFontSize",
  "prose-base",
);
export const atom_showStats = atomWithStorage<boolean>("showStats", false);

export const atom_fileName = atomWithStorage<string>("draft", "");
export const atom_content = atomWithStorage<string>("content", "");

// Vault / Local File System
export const atom_vaultHandle = atom<FileSystemDirectoryHandle | null>(null);
export const atom_currentDirectoryHandle =
  atom<FileSystemDirectoryHandle | null>(null);
export const atom_activeFileHandle = atom<FileSystemFileHandle | null>(null);
export const atom_activeFilePath = atom<string | null>(null);
export const atom_vaultFiles = atom<FileSystemHandle[]>([]);
export const atom_isVaultPending = atom<boolean>(false);
export const atom_hasLoadedVault = atom<boolean>(false);
