// Resolves `HEAD:<path>`: the commit's tree, then each path segment through
// the tree entries (`<mode> <name>\0<20 raw id bytes>`).
import { readObject } from "./git-objects";
import { bytesToHex } from "./git-pack";

function findEntry(tree: Uint8Array, name: string): { mode: string; id: string } | null {
  const decoder = new TextDecoder();
  let pos = 0;
  while (pos < tree.length) {
    const space = tree.indexOf(0x20, pos);
    const nul = tree.indexOf(0, space);
    const entryName = decoder.decode(tree.subarray(space + 1, nul));
    const id = bytesToHex(tree.subarray(nul + 1, nul + 21));
    if (entryName === name) return { mode: decoder.decode(tree.subarray(pos, space)), id };
    pos = nul + 21;
  }
  return null;
}

/** The blob at `path` in the commit, or null when the path is missing or isn't a file. */
export async function blobAtPath(gitDir: FileSystemDirectoryHandle, commitId: string, path: string): Promise<Uint8Array | null> {
  const commit = await readObject(gitDir, commitId);
  const match = /^tree ([0-9a-f]{40})/m.exec(new TextDecoder().decode(commit.data));
  if (!match) return null;
  const parts = path.split("/").filter(Boolean);
  let id = match[1];
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
