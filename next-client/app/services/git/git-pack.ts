// Reads objects out of git pack files (read-only). A pack is never loaded
// whole: the `.idx` is parsed (and cached), then the entry's bytes are
// inflated from a growing `file.slice()` window.
import { Unzlib } from "fflate";
import { getFileAt, readBytes, GitNotFoundError } from "./git-fs";

export type GitObjectType = "commit" | "tree" | "blob" | "tag";
export interface GitObject {
  type: GitObjectType;
  data: Uint8Array;
}

const TYPE_NAMES: Record<number, GitObjectType> = { 1: "commit", 2: "tree", 3: "blob", 4: "tag" };
const OFS_DELTA = 6;
const REF_DELTA = 7;
// Most entries (deltas above all) inflate from a few hundred bytes, so the
// first read is small and grows ×4 when an entry needs more.
const FIRST_WINDOW = 4 * 1024;
const MAX_DELTA_DEPTH = 50;

/** Reads a base object by id (used for REF_DELTA). */
export type ObjectResolver = (id: string) => Promise<GitObject>;

interface PackIndex {
  count: number;
  view: DataView;
  bytes: Uint8Array;
}

const idxCache = new Map<string, { modified: number; size: number; index: PackIndex | null }>();

// The `.idx` names in each repository's `objects/pack`, listed once and again
// only when an id isn't found (a fetch or gc may have added packs).
const packLists = new WeakMap<FileSystemDirectoryHandle, string[]>();

// Decoded pack entries by pack and offset: a delta chain's bases are shared
// by the objects built on them, so each is inflated once.
const MAX_ENTRIES = 256;
const MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const entryCache = new Map<string, GitObject>();
let entryBytes = 0;

function rememberEntry(key: string, object: GitObject): void {
  if (object.data.length > MAX_ENTRY_BYTES / 4) return;
  entryCache.set(key, object);
  entryBytes += object.data.length;
  for (const [oldest, old] of entryCache) {
    if (entryCache.size <= MAX_ENTRIES && entryBytes <= MAX_ENTRY_BYTES) break;
    entryCache.delete(oldest);
    entryBytes -= old.data.length;
  }
}

export function clearPackIndexCache(): void {
  idxCache.clear();
  entryCache.clear();
  entryBytes = 0;
}

function parseIdx(bytes: Uint8Array): PackIndex | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 8 + 1024 || view.getUint32(0) !== 0xff744f63 || view.getUint32(4) !== 2) return null;
  return { count: view.getUint32(8 + 255 * 4), view, bytes };
}

function hexToBytes(id: string): Uint8Array {
  const out = new Uint8Array(id.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(id.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

function offsetInIndex(index: PackIndex, id: string): number | null {
  const target = hexToBytes(id);
  const first = target[0];
  let lo = first === 0 ? 0 : index.view.getUint32(8 + (first - 1) * 4);
  let hi = index.view.getUint32(8 + first * 4);
  const idsStart = 8 + 1024;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const at = idsStart + mid * 20;
    let cmp = 0;
    for (let i = 0; i < 20 && cmp === 0; i++) cmp = index.bytes[at + i] - target[i];
    if (cmp === 0) {
      const offsetsStart = idsStart + index.count * 24;
      const small = index.view.getUint32(offsetsStart + mid * 4);
      if (!(small & 0x80000000)) return small;
      const largeStart = offsetsStart + index.count * 4;
      return Number(index.view.getBigUint64(largeStart + (small & 0x7fffffff) * 8));
    }
    if (cmp < 0) lo = mid + 1;
    else hi = mid;
  }
  return null;
}

async function loadIndex(packDir: FileSystemDirectoryHandle, name: string): Promise<PackIndex | null> {
  const file = await getFileAt(packDir, name);
  if (!file) return null;
  const cached = idxCache.get(name);
  if (cached && cached.modified === file.lastModified && cached.size === file.size) return cached.index;
  const index = parseIdx(await readBytes(file));
  idxCache.set(name, { modified: file.lastModified, size: file.size, index });
  return index;
}

async function listIdx(packDir: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = [];
  for await (const entry of (packDir as any).values() as AsyncIterable<FileSystemHandle>) {
    if (entry.kind === "file" && entry.name.endsWith(".idx")) names.push(entry.name);
  }
  return names;
}

async function findInList(packDir: FileSystemDirectoryHandle, names: string[], id: string): Promise<{ pack: File; offset: number } | null> {
  for (const name of names) {
    const index = await loadIndex(packDir, name);
    const offset = index ? offsetInIndex(index, id) : null;
    if (offset === null) continue;
    const pack = await getFileAt(packDir, name.slice(0, -4) + ".pack");
    if (pack) return { pack, offset };
  }
  return null;
}

/** Finds `id` in the repository's packs: the pack file and the entry's offset. */
export async function findInPacks(gitDir: FileSystemDirectoryHandle, id: string): Promise<{ pack: File; offset: number } | null> {
  let packDir: FileSystemDirectoryHandle;
  try {
    packDir = await (await gitDir.getDirectoryHandle("objects")).getDirectoryHandle("pack");
  } catch {
    return null;
  }
  const cached = packLists.get(gitDir);
  if (cached) {
    const found = await findInList(packDir, cached, id);
    if (found) return found;
  }
  const names = await listIdx(packDir);
  packLists.set(gitDir, names);
  if (cached && names.length === cached.length && names.every((name, i) => name === cached[i])) return null;
  return findInList(packDir, names, id);
}

/** Applies a git delta to `base`. */
export function applyDelta(base: Uint8Array, delta: Uint8Array): Uint8Array {
  let pos = 0;
  const varint = () => {
    let value = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = delta[pos++];
      value += (byte & 0x7f) * 2 ** shift;
      shift += 7;
    } while (byte & 0x80);
    return value;
  };
  const sourceSize = varint();
  const targetSize = varint();
  if (sourceSize !== base.length) throw new Error("git: delta base size mismatch");
  const out = new Uint8Array(targetSize);
  let written = 0;
  while (pos < delta.length) {
    const op = delta[pos++];
    if (op & 0x80) {
      let offset = 0;
      let size = 0;
      for (let i = 0; i < 4; i++) if (op & (1 << i)) offset += delta[pos++] * 2 ** (8 * i);
      for (let i = 0; i < 3; i++) if (op & (0x10 << i)) size += delta[pos++] * 2 ** (8 * i);
      if (size === 0) size = 0x10000;
      out.set(base.subarray(offset, offset + size), written);
      written += size;
    } else if (op > 0) {
      out.set(delta.subarray(pos, pos + op), written);
      written += op;
      pos += op;
    } else {
      throw new Error("git: bad delta opcode");
    }
  }
  if (written !== targetSize) throw new Error("git: delta size mismatch");
  return out;
}

function inflateWindow(chunk: Uint8Array, size: number): Uint8Array | null {
  const parts: Uint8Array[] = [];
  let total = 0;
  const inflater = new Unzlib((part) => {
    parts.push(part);
    total += part.length;
  });
  inflater.push(chunk, false);
  if (total < size) return null;
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out.subarray(0, size);
}

/** Reads the object at `offset` in `pack`, resolving delta chains. */
export async function readPackEntry(pack: File, offset: number, resolve: ObjectResolver, depth = 0): Promise<GitObject> {
  if (depth > MAX_DELTA_DEPTH) throw new Error("git: delta chain too deep");
  const key = pack.name + ":" + pack.size + ":" + pack.lastModified + ":" + offset;
  const hit = entryCache.get(key);
  if (hit) return hit;
  const object = await inflateEntry(pack, offset, resolve, depth);
  rememberEntry(key, object);
  return object;
}

async function inflateEntry(pack: File, offset: number, resolve: ObjectResolver, depth: number): Promise<GitObject> {
  for (let window = FIRST_WINDOW; ; window *= 4) {
    const end = Math.min(offset + window, pack.size);
    const bytes = await readBytes(pack.slice(offset, end));
    let pos = 0;
    let byte = bytes[pos++];
    const type = (byte >> 4) & 7;
    let size = byte & 15;
    let shift = 4;
    while (byte & 0x80) {
      byte = bytes[pos++];
      size += (byte & 0x7f) * 2 ** shift;
      shift += 7;
    }
    let baseOffset = -1;
    let baseId = "";
    if (type === OFS_DELTA) {
      byte = bytes[pos++];
      let back = byte & 0x7f;
      while (byte & 0x80) {
        byte = bytes[pos++];
        back = (back + 1) * 128 + (byte & 0x7f);
      }
      baseOffset = offset - back;
    } else if (type === REF_DELTA) {
      baseId = bytesToHex(bytes.subarray(pos, pos + 20));
      pos += 20;
    }
    const data = inflateWindow(bytes.subarray(pos), size);
    if (!data) {
      if (end >= pack.size) throw new Error("git: truncated pack entry");
      continue;
    }
    if (type === OFS_DELTA || type === REF_DELTA) {
      const base = type === OFS_DELTA ? await readPackEntry(pack, baseOffset, resolve, depth + 1) : await resolve(baseId);
      return { type: base.type, data: applyDelta(base.data, data) };
    }
    const name = TYPE_NAMES[type];
    if (!name) throw new GitNotFoundError("object type " + type);
    return { type: name, data };
  }
}
