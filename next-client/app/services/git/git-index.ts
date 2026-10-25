// Reads `.git/index` (versions 2, 3 and 4) for the Changes page: per path, the
// blob id, size and mtime git recorded when it last looked at the file. A file
// whose stat still matches needn't be read. Of the extensions only the cache
// tree's root is read; the checksum is ignored. Read only.
import { getFileAt } from "./git-fs";
import { bytesToHex } from "./git-pack";

export interface IndexEntry {
  id: string;
  size: number;
  mtimeSec: number;
  stage: number;
  mode: number;
}

export interface GitIndex {
  entries: Map<string, IndexEntry>;
  /** The tree the whole index would write, when the cache tree still knows it (`git commit` leaves it, `git add` clears it). */
  rootTree: string | null;
  /** When the index file was last written. */
  mtimeMs: number;
}

export interface ParsedIndex {
  entries: Map<string, IndexEntry>;
  rootTree: string | null;
}

const FIXED = 62; // ctime..size (40), id (20), flags (2)

/** The root's id in a `TREE` extension (`<path>\0<count> <subtrees>\n<id>`, root first, count -1 when invalid). */
function cacheTreeRoot(data: Uint8Array): string | null {
  if (data[0] !== 0) return null; // the root's path is empty
  const newline = data.indexOf(0x0a, 1);
  if (newline === -1 || newline + 21 > data.length) return null;
  const count = Number(new TextDecoder().decode(data.subarray(1, newline)).split(" ")[0]);
  return count >= 0 ? bytesToHex(data.subarray(newline + 1, newline + 21)) : null;
}

/** Parses index bytes; null for a bad signature or an unsupported version. */
export function parseIndex(bytes: Uint8Array): ParsedIndex | null {
  if (bytes.length < 12) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0) !== 0x44495243) return null; // "DIRC"
  const version = view.getUint32(4);
  if (version < 2 || version > 4) return null;
  const count = view.getUint32(8);
  const decoder = new TextDecoder();
  const entries = new Map<string, IndexEntry>();
  let pos = 12;
  let previous = "";
  let sparse = false;
  for (let i = 0; i < count; i++) {
    if (pos + FIXED > bytes.length) return null;
    const start = pos;
    const mtimeSec = view.getUint32(pos + 8);
    const mode = view.getUint32(pos + 24);
    const size = view.getUint32(pos + 36);
    const id = bytesToHex(bytes.subarray(pos + 40, pos + 60));
    const flags = view.getUint16(pos + 60);
    pos += FIXED;
    if (version >= 3 && flags & 0x4000) pos += 2;
    let path: string;
    if (version === 4) {
      // Offset varint: how many bytes to strip from the previous path.
      let byte = bytes[pos++];
      let strip = byte & 127;
      while (byte & 128) {
        byte = bytes[pos++];
        strip = ((strip + 1) << 7) | (byte & 127);
      }
      const nul = bytes.indexOf(0, pos);
      if (nul === -1) return null;
      path = previous.slice(0, Math.max(0, previous.length - strip)) + decoder.decode(bytes.subarray(pos, nul));
      pos = nul + 1;
    } else {
      const nul = bytes.indexOf(0, pos);
      if (nul === -1) return null;
      path = decoder.decode(bytes.subarray(pos, nul));
      const length = nul + 1 - start;
      pos = start + Math.ceil(length / 8) * 8;
    }
    previous = path;
    if ((mode & 0o170000) === 0o040000) {
      sparse = true; // sparse directory entry
      continue;
    }
    const stage = (flags >> 12) & 3;
    const existing = entries.get(path);
    if (!existing || (existing.stage !== 0 && stage < existing.stage)) entries.set(path, { id, size, mtimeSec, stage, mode });
  }
  // Extensions (`<4-byte signature><4-byte size><data>`) run up to the 20-byte checksum.
  let rootTree: string | null = null;
  while (pos + 8 <= bytes.length - 20) {
    const signature = String.fromCharCode(...bytes.subarray(pos, pos + 4));
    const size = view.getUint32(pos + 4);
    if (signature === "TREE") rootTree = cacheTreeRoot(bytes.subarray(pos + 8, pos + 8 + size));
    pos += 8 + size;
  }
  // A sparse index's entries aren't the whole tree.
  return { entries, rootTree: sparse ? null : rootTree };
}

/** The index, or null when it's missing or unreadable (callers then hash everything). */
export async function readIndex(gitDir: FileSystemDirectoryHandle): Promise<GitIndex | null> {
  const file = await getFileAt(gitDir, "index");
  if (!file) return null;
  const parsed = parseIndex(new Uint8Array(await file.arrayBuffer()));
  return parsed ? { ...parsed, mtimeMs: file.lastModified } : null;
}
