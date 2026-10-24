import { withRetry } from "./shared";
import { isPlainTextPath } from "@/app/utils/file-kinds";

// Creates `<baseName>.md` in `dir`, or `<baseName> (1).md`, `(2)`… when the
// name is taken. A base name ending in `.board` keeps that suffix last
// (`Untitled (1).board.md`). With `keepTextName`, a text file's name
// (isPlainTextPath: `util.ts`, `Dockerfile`) is kept as typed, numbered
// before its extension (`util (1).ts`); only for names the user typed as a
// file name, never a draft title. Never overwrites. Returns the new (empty)
// file's handle.
// Used where the text already exists and must not be lost (a draft's first
// save, a file named in the file tree); notes made from templates or links
// open the existing note instead.
export async function createUniqueFile(
  dir: FileSystemDirectoryHandle,
  baseName: string,
  { keepTextName = false }: { keepTextName?: boolean } = {},
): Promise<{ handle: FileSystemFileHandle; fileName: string }> {
  const isText = keepTextName && isPlainTextPath(baseName);
  const dot = baseName.lastIndexOf(".");
  const suffix = isText ? (dot > 0 ? baseName.slice(dot) : "") : baseName.endsWith(".board") ? ".board" : "";
  const extension = isText ? "" : ".md";
  const stem = suffix ? baseName.slice(0, -suffix.length) : baseName;
  let fileName = `${stem}${suffix}${extension}`;
  let counter = 1;
  while (true) {
    try {
      await withRetry(() => dir.getFileHandle(fileName, { create: false }));
      // No throw: the name is taken.
      fileName = `${stem} (${counter++})${suffix}${extension}`;
    } catch (err: any) {
      if (err?.name !== "NotFoundError") throw err;
      const handle = await withRetry(() => dir.getFileHandle(fileName, { create: true }));
      return { handle, fileName };
    }
  }
}

// Walks (creating as needed) a vault-relative folder path such as
// `inbox/daily`. An empty path is the vault root.
export async function ensureVaultFolder(
  vaultHandle: FileSystemDirectoryHandle,
  folderPath: string,
): Promise<FileSystemDirectoryHandle> {
  let current = vaultHandle;
  for (const part of normalizeFolderPath(folderPath).split("/").filter(Boolean)) {
    current = await withRetry(() => current.getDirectoryHandle(part, { create: true }));
  }
  return current;
}

// Trims slashes and whitespace around each segment and drops `.`/`..`, so a
// user-typed setting can't point outside the vault.
export function normalizeFolderPath(folderPath: string): string {
  return folderPath
    .split(/[\\/]/)
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}
