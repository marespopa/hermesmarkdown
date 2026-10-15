// Reading embedded files for the editor's embeds and the compiled exports.
// Every read checks the file's modified time and only re-reads text (or makes
// a new image URL) when it changed, so asking again is cheap.
import { resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import type { FileMetadata } from "@/app/atoms/metadata";
import { fileCandidatePaths, type EmbedRef } from "./note-embeds";

const MAX_CACHED = 50;
const texts = new Map<string, { modified: number; text: string }>();
const urls = new Map<string, { modified: number; url: string }>();

function remember<T>(cache: Map<string, T>, key: string, value: T, drop?: (old: T) => void) {
  const old = cache.get(key);
  if (old && drop) drop(old);
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > MAX_CACHED) {
    const oldestKey = cache.keys().next().value!;
    if (drop) drop(cache.get(oldestKey)!);
    cache.delete(oldestKey);
  }
}

async function textOf(path: string, file: File): Promise<string> {
  const cached = texts.get(path);
  if (cached && cached.modified === file.lastModified) return cached.text;
  const text = await file.text();
  remember(texts, path, { modified: file.lastModified, text });
  return text;
}

/** A note's text from disk (cached by modified time), or null when it can't be read. */
export async function readNoteFile(meta: FileMetadata): Promise<string | null> {
  try {
    return await textOf(meta.path, await meta.handle.getFile());
  } catch {
    return null;
  }
}

/** A file that isn't a note (CSV, image, code), found next to the note or from the vault root. */
export async function locateVaultFile(
  vault: FileSystemDirectoryHandle | null,
  ref: EmbedRef,
  fromPath: string | undefined,
): Promise<{ path: string; file: File } | null> {
  if (!vault) return null;
  for (const path of fileCandidatePaths(ref.target, fromPath)) {
    try {
      return { path, file: await (await resolveFileHandleAtPath(vault, path)).getFile() };
    } catch {
      // Not there; try the next place.
    }
  }
  return null;
}

/** The text of a located file, cached by modified time. */
export const readLocatedText = (located: { path: string; file: File }) => textOf(located.path, located.file);

/** An object URL for a located image, made again only when the file changed. */
export function imageUrlFor({ path, file }: { path: string; file: File }): string {
  const cached = urls.get(path);
  if (cached && cached.modified === file.lastModified) return cached.url;
  const url = URL.createObjectURL(file);
  remember(urls, path, { modified: file.lastModified, url }, (old) => URL.revokeObjectURL(old.url));
  return url;
}

/** Code files show at most this many lines. */
export const MAX_CODE_LINES = 400;

/** The first MAX_CODE_LINES lines of `code`, and how many were left out. */
export function clipCode(code: string): { code: string; more: number } {
  const lines = code.replace(/\n$/, "").split("\n");
  if (lines.length <= MAX_CODE_LINES) return { code: lines.join("\n"), more: 0 };
  return { code: lines.slice(0, MAX_CODE_LINES).join("\n"), more: lines.length - MAX_CODE_LINES };
}
