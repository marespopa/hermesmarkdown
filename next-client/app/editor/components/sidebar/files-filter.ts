// The Files section's filter: a regular expression, case-insensitive,
// matched against each file's vault path ("projects/.*plan" works). Typed
// text that isn't a valid pattern is matched as plain text instead.
export interface FilesFilter {
  test: (path: string) => boolean;
  valid: boolean;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Null for an empty query (show everything).
export function compileFilesFilter(query: string): FilesFilter | null {
  const source = query.trim();
  if (!source) return null;
  try {
    const pattern = new RegExp(source, "i");
    return { test: (path) => pattern.test(path), valid: true };
  } catch {
    const plain = new RegExp(escape(source), "i");
    return { test: (path) => plain.test(path), valid: false };
  }
}

// The files whose path matches, and the folders to show them in: every
// folder above a match, plus folders whose own path matches.
export function filterVault<T>(files: T[], folderPaths: string[], filter: FilesFilter, pathOf: (file: T) => string): { files: T[]; folderPaths: string[] } {
  const shown = files.filter((file) => filter.test(pathOf(file)));
  const folders = new Set(folderPaths.filter((path) => filter.test(path)));
  for (const file of shown) {
    const parts = pathOf(file).split("/");
    for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join("/"));
  }
  return { files: shown, folderPaths: folderPaths.filter((path) => folders.has(path)) };
}
