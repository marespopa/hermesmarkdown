import { isPrivateContent, isPrivateFrontmatter } from "@/app/utils/note-privacy";
import type { FileMetadata } from "@/app/atoms/metadata";
import { isMarkdownPath } from "@/app/utils/file-kinds";

// The pure half of search_files: which files to search, the
// matches in one file's text, and the answers. use-companion-tools.ts reads
// the files (one at a time, on the main thread, so the palette's own search
// worker is never interrupted) and runs these.

export const SEARCH_DEFAULT_LIMIT = 30;
export const SEARCH_MAX_FILES = 3000;
const LINE_CHARS = 200;

export type SearchMatch = { path: string; line: number; text: string };

// A search's matcher: a case-insensitive text search, or the model's regex
// (null when it isn't a valid pattern).
export function searchMatcher(query: string, regex: boolean): ((line: string) => boolean) | null {
  if (!regex) {
    const needle = query.toLowerCase();
    return (line) => line.toLowerCase().includes(needle);
  }
  try {
    const pattern = new RegExp(query, "i");
    return (line) => pattern.test(line);
  } catch {
    return null;
  }
}

// The paths to search: every note and text file inside `folder`, never a
// private note, in path order.
export function searchablePaths(notes: Record<string, FileMetadata>, textFiles: string[], folder: string): string[] {
  const prefix = folder ? `${folder}/` : "";
  return [...new Set([...Object.keys(notes), ...textFiles])]
    .filter((path) => path.startsWith(prefix) && !path.startsWith(".hermesmarkdown/"))
    .filter((path) => !isPrivateFrontmatter(notes[path]?.frontmatter))
    .sort((a, b) => a.localeCompare(b));
}

// The matching lines of one file's text (none for a private note).
export function matchesIn(path: string, text: string, matches: (line: string) => boolean, room: number): SearchMatch[] {
  if (isMarkdownPath(path) && isPrivateContent(text)) return [];
  const found: SearchMatch[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length && found.length < room; i++) {
    if (matches(lines[i])) found.push({ path, line: i + 1, text: lines[i].trim().slice(0, LINE_CHARS) });
  }
  return found;
}

// A glob as a test on a path: ** crosses folders (**/ also matches none), * stays in one, ? is one
// character; with no / in the pattern only the file's name is tested.
export function globMatcher(pattern: string): (path: string) => boolean {
  const source = pattern.replace(/^\.?\//, "").split("**/").map((chunk) => chunk.split("**").map((part) => part
    .replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]")).join(".*")).join("(?:.*/)?");
  const regex = new RegExp(`^${source}$`, "i");
  const byName = !pattern.includes("/");
  return (path) => regex.test(byName ? path.slice(path.lastIndexOf("/") + 1) : path);
}

export function findFilesOutput(pattern: string, paths: string[], limit: number): string {
  if (!paths.length) return `No file matches "${pattern}".`;
  const shown = paths.slice(0, limit).join("\n");
  return `${paths.length} file${paths.length === 1 ? "" : "s"} match${paths.length === 1 ? "es" : ""}:\n${shown}${paths.length > limit ? `\n[${paths.length - limit} more; narrow the pattern]` : ""}`;
}

export function searchFilesOutput(query: string, hits: SearchMatch[], { limit, truncated, scanned }: { limit: number; truncated: boolean; scanned: number }): string {
  if (!hits.length) return `No file has "${query}"${truncated ? ` in the ${scanned} files searched; the vault is bigger, so narrow it with folder` : ""}.`;
  const lines = hits.map(({ path, line, text }) => `${path}:${line}: ${text}`);
  const note = hits.length >= limit ? `\n[stopped at ${limit} matches; narrow the query or folder for the rest]` : truncated ? `\n[searched ${scanned} files; narrow it with folder to cover the rest]` : "";
  return `${hits.length} match${hits.length === 1 ? "" : "es"}:\n${lines.join("\n")}${note}`;
}
