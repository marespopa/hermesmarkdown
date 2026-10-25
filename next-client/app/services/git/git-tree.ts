// Resolves `HEAD:<path>`: the commit's tree, then each path segment through
// the tree entries (`<mode> <name>\0<20 raw id bytes>`).
import { readObject } from "./git-objects";
import { bytesToHex } from "./git-pack";

export interface TreeEntry {
  mode: string;
  name: string;
  id: string;
}

export function parseTreeEntries(tree: Uint8Array): TreeEntry[] {
  const decoder = new TextDecoder();
  const entries: TreeEntry[] = [];
  let pos = 0;
  while (pos < tree.length) {
    const space = tree.indexOf(0x20, pos);
    const nul = tree.indexOf(0, space);
    entries.push({
      mode: decoder.decode(tree.subarray(pos, space)),
      name: decoder.decode(tree.subarray(space + 1, nul)),
      id: bytesToHex(tree.subarray(nul + 1, nul + 21)),
    });
    pos = nul + 21;
  }
  return entries;
}

function findEntry(tree: Uint8Array, name: string): { mode: string; id: string } | null {
  return parseTreeEntries(tree).find((entry) => entry.name === name) ?? null;
}

/** The commit's root tree id. */
export async function treeIdOf(gitDir: FileSystemDirectoryHandle, commitId: string): Promise<string | null> {
  const commit = await readObject(gitDir, commitId);
  const match = /^tree ([0-9a-f]{40})/m.exec(new TextDecoder().decode(commit.data));
  return match ? match[1] : null;
}

export interface TreeListing {
  /** Regular files (modes 100644 / 100755) by path. */
  files: Map<string, { id: string; mode: string }>;
  /** Submodule paths (mode 160000). Symlinks are left out of both. */
  submodules: Set<string>;
}

/** Every file in the commit's tree, found by walking it from the root. */
export async function listTreeFiles(gitDir: FileSystemDirectoryHandle, commitId: string): Promise<TreeListing> {
  const listing: TreeListing = { files: new Map(), submodules: new Set() };
  const rootId = await treeIdOf(gitDir, commitId);
  if (!rootId) return listing;
  const walk = async (treeId: string, prefix: string): Promise<void> => {
    const object = await readObject(gitDir, treeId);
    if (object.type !== "tree") return;
    for (const entry of parseTreeEntries(object.data)) {
      const path = prefix + entry.name;
      if (entry.mode === "40000" || entry.mode === "040000") await walk(entry.id, path + "/");
      else if (entry.mode === "160000") listing.submodules.add(path);
      else if (entry.mode === "100644" || entry.mode === "100755") listing.files.set(path, { id: entry.id, mode: entry.mode });
    }
  };
  await walk(rootId, "");
  return listing;
}

/** The blob at `path` in the commit, or null when the path is missing or isn't a file. */
export async function blobAtPath(gitDir: FileSystemDirectoryHandle, commitId: string, path: string): Promise<Uint8Array | null> {
  const treeId = await treeIdOf(gitDir, commitId);
  if (!treeId) return null;
  const parts = path.split("/").filter(Boolean);
  let id = treeId;
  for (let i = 0; i < parts.length; i++) {
    const object = await readObject(gitDir, id);
    if (object.type !== "tree") return null;
    const entry = findEntry(object.data, parts[i]);
    if (!entry) return null;
    id = entry.id;
    if (i === parts.length - 1) {
      if (entry.mode.startsWith("4") || entry.mode.startsWith("16")) return null; // tree or submodule
      const blob = await readObject(gitDir, id);
      return blob.type === "blob" ? blob.data : null;
    }
  }
  return null;
}
