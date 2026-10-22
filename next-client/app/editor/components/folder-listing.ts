// One folder's contents for the pane title's folder popover (FolderPopover):
// its subfolders, then its notes, each by name, as the Files tree lists them.
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

/** Rows whose name holds every word of `query`, ignoring case. */
export function filterListing(listing: FolderListing, query: string): FolderListing {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return listing;
  const matches = (name: string) => words.every((word) => name.toLowerCase().includes(word));
  return { folders: listing.folders.filter((f) => matches(f.name)), notes: listing.notes.filter((n) => matches(n.name)) };
}
