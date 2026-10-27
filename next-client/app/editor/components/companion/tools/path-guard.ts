import { isVaultDataPath } from "@/app/services/vault-data-dir";
import { isMarkdownPath, isPlainTextPath } from "@/app/utils/file-kinds";

// Paths the model names, made safe before any tool touches the vault:
// normalised to vault-relative form, kept inside the vault, and never in the
// vault's own data folder (`.hermesmarkdown/`, which holds Trash).

export type GuardedPath = { ok: true; path: string } | { ok: false; reason: string };

// "./Projects//Roadmap.md" → "Projects/Roadmap.md"; "" or "/" is the vault's
// top level. Null for a path that climbs out of the vault (`..`).
export function normalizeVaultPath(input: string): string | null {
  const segments = input.trim().replace(/\\/g, "/").split("/").filter((segment) => segment && segment !== ".");
  if (segments.some((segment) => segment === "..")) return null;
  return segments.join("/");
}

// A folder the companion may look into ("" is the top level).
export function guardFolderPath(input: string): GuardedPath {
  const path = normalizeVaultPath(input);
  if (path === null) return { ok: false, reason: `"${input}" is outside the vault.` };
  if (isVaultDataPath(path)) return { ok: false, reason: `${path} is the app's own data folder, which the AI can't use.` };
  return { ok: true, path };
}

// A file the companion may read: a note or a text file the app knows
// (utils/file-kinds.ts), not in the data folder.
export function guardFilePath(input: string): GuardedPath {
  const folder = guardFolderPath(input);
  if (!folder.ok) return folder;
  const { path } = folder;
  if (!path) return { ok: false, reason: "Name a file, not the vault's top level." };
  if (!isMarkdownPath(path) && !isPlainTextPath(path)) {
    return { ok: false, reason: `${path} isn't a note or a text file the AI can read.` };
  }
  return { ok: true, path };
}

// A file or folder the companion may rename, move or put in the Trash: any
// kind of file, but never the vault's top level or its data folder.
export function guardItemPath(input: string): GuardedPath {
  const folder = guardFolderPath(input);
  if (!folder.ok) return folder;
  if (!folder.path) return { ok: false, reason: "Name a file or folder, not the vault's top level." };
  return folder;
}

// A new name for an item: one name, no folders. A file keeps its extension
// unless the new name ends in its own or another one the app knows ("Plan"
// or "Plan v1.2" for "Roadmap.md" → "Plan.md", "Plan v1.2.md").
export function guardNewName(input: string, currentName: string, isFile: boolean): GuardedPath {
  const name = input.trim();
  if (!name || name === "." || name === "..") return { ok: false, reason: "Give the new name." };
  if (/[\\/]/.test(name)) return { ok: false, reason: "A new name can't hold folders; use move to put it elsewhere." };
  const dot = currentName.lastIndexOf(".");
  const extension = isFile && dot > 0 ? currentName.slice(dot) : "";
  const keepsOwn = !extension || name.toLowerCase().endsWith(extension.toLowerCase()) || isMarkdownPath(name) || isPlainTextPath(name);
  return { ok: true, path: keepsOwn ? name : `${name}${extension}` };
}
