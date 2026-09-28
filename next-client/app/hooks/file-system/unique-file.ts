import { withRetry } from "./shared";

// Creates `<baseName>.md` in `dir`, or `<baseName> (1).md`, `(2)`… when the
// name is taken. Never overwrites. Returns the new (empty) file's handle.
export async function createUniqueFile(
  dir: FileSystemDirectoryHandle,
  baseName: string,
): Promise<{ handle: FileSystemFileHandle; fileName: string }> {
  let fileName = `${baseName}.md`;
  let counter = 1;
  while (true) {
    try {
      await withRetry(() => dir.getFileHandle(fileName, { create: false }));
      // No throw: the name is taken.
      fileName = `${baseName} (${counter++}).md`;
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
