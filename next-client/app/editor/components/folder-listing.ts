// One folder's contents for the pane title's folder popover (FolderPopover):
// its subfolders, then its notes, each by name, as the Files tree lists them;
// or, while you type, the matches anywhere below it (searchBelow).
// Folders come from the vault's folder list (empty ones included) and from
// the notes' own paths, so a folder the walk hasn't listed yet still shows.

export interface FolderNote {
  name: string;
  path: string;
  handle: FileSystemFileHandle;
}

export interface FolderEntry {
  name: string;
  path: string;
}

export interface FolderListing {
  folders: FolderEntry[];
  notes: FolderNote[];
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/** The folder holding `path` ("" = the vault's root). */
export function parentOf(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

/** A folder's last segment, or `rootName` for the vault's root. */
export function folderName(path: string, rootName: string): string {
  return path ? path.slice(path.lastIndexOf("/") + 1) : rootName;
}

export function listFolder(
  folder: string,
  files: readonly { name: string; path: string; handle: FileSystemFileHandle }[],
  folderPaths: readonly string[],
): FolderListing {
  const prefix = folder ? `${folder}/` : "";
  const subfolders = new Map<string, FolderEntry>();
  // The child of `folder` that `path` (a folder or a note's folder) sits in.
  const addChild = (path: string) => {
    if (!path.startsWith(prefix) || path === folder) return;
    const name = path.slice(prefix.length).split("/")[0];
    if (name && !subfolders.has(name)) subfolders.set(name, { name, path: prefix + name });
  };
  for (const path of folderPaths) addChild(path);

  const notes: FolderNote[] = [];
  for (const file of files) {
    const parent = parentOf(file.path);
    if (parent === folder) notes.push({ name: file.name.replace(/\.md$/i, ""), path: file.path, handle: file.handle });
    else addChild(parent);
  }
  return { folders: [...subfolders.values()].sort(byName), notes: notes.sort(byName) };
}

/** One row of the popover's list; `where` is the row's folder below the
 *  searched one ("" directly inside it), set only on search results. */
export type FolderRow = (({ kind: "folder" } & FolderEntry) | ({ kind: "note" } & FolderNote)) & { where?: string };

/** A listing as rows: its subfolders, then its notes. */
export function listingRows(listing: FolderListing): FolderRow[] {
  return [
    ...listing.folders.map((entry) => ({ kind: "folder" as const, ...entry })),
    ...listing.notes.map((entry) => ({ kind: "note" as const, ...entry })),
  ];
}

/** Every folder and note anywhere below `folder` ("" = the whole vault)
 *  whose name holds every word of `query`, ignoring case. Names that start
 *  with the query come first, then folders before notes, then by name. */
export function searchBelow(
  folder: string,
  files: readonly { name: string; path: string; handle: FileSystemFileHandle }[],
  folderPaths: readonly string[],
  query: string,
): FolderRow[] {
  const typed = query.trim().toLowerCase();
  const words = typed.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const prefix = folder ? `${folder}/` : "";
  const below = (path: string) => path.startsWith(prefix) && path !== folder;
  const matches = (name: string) => words.every((word) => name.toLowerCase().includes(word));
  const where = (path: string) => parentOf(path).slice(prefix.length);

  // Folders from the folder list and from every note's own path, so one the
  // walk hasn't listed yet is still found.
  const folders = new Set<string>();
  for (const path of folderPaths) if (below(path)) folders.add(path);
  for (const file of files) {
    for (let path = parentOf(file.path); below(path) && !folders.has(path); path = parentOf(path)) folders.add(path);
  }

  const rows: FolderRow[] = [];
  for (const path of folders) {
    const name = folderName(path, "");
    if (matches(name)) rows.push({ kind: "folder", name, path, where: where(path) });
  }
  for (const file of files) {
    const name = file.name.replace(/\.md$/i, "");
    if (below(file.path) && matches(name)) rows.push({ kind: "note", name, path: file.path, handle: file.handle, where: where(file.path) });
  }
  const rank = (row: FolderRow) => (row.name.toLowerCase().startsWith(typed) ? 0 : 2) + (row.kind === "folder" ? 0 : 1);
  return rows.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
