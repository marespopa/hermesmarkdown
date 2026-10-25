// Test helpers: build git objects, trees, delta-compressed pack files and v2
// pack indexes in memory, and lay them out in a MemoryDirectoryHandle repo.
import { zlibSync } from "fflate";
import { MemoryDirectoryHandle } from "../memory-file-system.test-utils";

const encoder = new TextEncoder();

/** A fake 40-hex object id (ids aren't verified against content). */
export function fakeId(n: number): string {
  return n.toString(16).padStart(40, "0");
}

function hexBytes(id: string): Uint8Array {
  const out = new Uint8Array(20);
  for (let i = 0; i < 20; i++) out[i] = parseInt(id.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export function looseObject(type: string, data: Uint8Array | string): Uint8Array {
  const body = typeof data === "string" ? encoder.encode(data) : data;
  return zlibSync(concat(encoder.encode(type + " " + body.length + "\0"), body));
}

export function treeData(entries: { mode: string; name: string; id: string }[]): Uint8Array {
  return concat(...entries.map((entry) => concat(encoder.encode(entry.mode + " " + entry.name + "\0"), hexBytes(entry.id))));
}

export function commitData(treeId: string): string {
  return "tree " + treeId + "\nauthor a <a@example.com> 0 +0000\n\nmessage\n";
}

function sizeVarint(type: number, size: number): Uint8Array {
  const bytes: number[] = [];
  let first = (type << 4) | (size & 15);
  size = Math.floor(size / 16);
  while (size > 0) {
    bytes.push(first | 0x80);
    first = size & 0x7f;
    size = Math.floor(size / 128);
  }
  bytes.push(first);
  return Uint8Array.from(bytes);
}

function deltaVarint(value: number): number[] {
  const bytes: number[] = [];
  do {
    let byte = value & 0x7f;
    value = Math.floor(value / 128);
    if (value > 0) byte |= 0x80;
    bytes.push(byte);
  } while (value > 0);
  return bytes;
}

export type DeltaOp = { copy: { offset: number; size: number } } | { insert: string };

/** A git delta turning a `sourceSize`-byte base into the result of `ops`. */
export function makeDelta(sourceSize: number, ops: DeltaOp[]): Uint8Array {
  const out: number[] = [];
  let targetSize = 0;
  const body: number[] = [];
  for (const op of ops) {
    if ("insert" in op) {
      const bytes = encoder.encode(op.insert);
      body.push(bytes.length, ...bytes);
      targetSize += bytes.length;
    } else {
      const { offset, size } = op.copy;
      let code = 0x80;
      const args: number[] = [];
      for (let i = 0; i < 4; i++) {
        const byte = Math.floor(offset / 2 ** (8 * i)) & 0xff;
        if (byte) {
          code |= 1 << i;
          args.push(byte);
        }
      }
      if (size !== 0x10000) {
        for (let i = 0; i < 3; i++) {
          const byte = Math.floor(size / 2 ** (8 * i)) & 0xff;
          if (byte) {
            code |= 0x10 << i;
            args.push(byte);
          }
        }
      }
      body.push(code, ...args);
      targetSize += size;
    }
  }
  out.push(...deltaVarint(sourceSize), ...deltaVarint(targetSize), ...body);
  return Uint8Array.from(out);
}

export type PackEntry =
  | { id: string; type: "commit" | "tree" | "blob"; data: Uint8Array | string }
  | { id: string; delta: Uint8Array; baseOffsetOf: string }
  | { id: string; delta: Uint8Array; baseId: string };

const TYPE_CODES: Record<string, number> = { commit: 1, tree: 2, blob: 3 };

/** A pack and its v2 index. `largeOffsetFor` stores that id's offset in the 8-byte table. */
export function buildPack(entries: PackEntry[], largeOffsetFor?: string): { pack: Uint8Array; idx: Uint8Array; offsets: Map<string, number> } {
  const offsets = new Map<string, number>();
  const chunks: Uint8Array[] = [concat(encoder.encode("PACK"), Uint8Array.from([0, 0, 0, 2, 0, 0, 0, entries.length]))];
  let position = chunks[0].length;
  for (const entry of entries) {
    offsets.set(entry.id, position);
    let chunk: Uint8Array;
    if ("type" in entry) {
      const data = typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data;
      chunk = concat(sizeVarint(TYPE_CODES[entry.type], data.length), zlibSync(data));
    } else if ("baseOffsetOf" in entry) {
      let back = position - offsets.get(entry.baseOffsetOf)!;
      const bytes = [back & 0x7f];
      while ((back = Math.floor(back / 128) - 1) >= 0) bytes.unshift(0x80 | (back & 0x7f));
      chunk = concat(sizeVarint(6, entry.delta.length), Uint8Array.from(bytes), zlibSync(entry.delta));
    } else {
      chunk = concat(sizeVarint(7, entry.delta.length), hexBytes(entry.baseId), zlibSync(entry.delta));
    }
    chunks.push(chunk);
    position += chunk.length;
  }
  return { pack: concat(...chunks, new Uint8Array(20)), idx: buildIdx(offsets, largeOffsetFor), offsets };
}

function buildIdx(offsets: Map<string, number>, largeOffsetFor?: string): Uint8Array {
  const ids = [...offsets.keys()].sort();
  const fanout = new Uint32Array(256);
  for (const id of ids) for (let b = parseInt(id.slice(0, 2), 16); b < 256; b++) fanout[b]++;
  const head = new Uint8Array(8 + 1024);
  const view = new DataView(head.buffer);
  view.setUint32(0, 0xff744f63);
  view.setUint32(4, 2);
  fanout.forEach((count, i) => view.setUint32(8 + i * 4, count));
  const idBytes = concat(...ids.map(hexBytes));
  const crcs = new Uint8Array(ids.length * 4);
  const small = new DataView(new ArrayBuffer(ids.length * 4));
  const large: number[] = [];
  ids.forEach((id, i) => {
    if (id === largeOffsetFor) {
      small.setUint32(i * 4, 0x80000000 | large.length);
      large.push(offsets.get(id)!);
    } else {
      small.setUint32(i * 4, offsets.get(id)!);
    }
  });
  const largeTable = new DataView(new ArrayBuffer(large.length * 8));
  large.forEach((offset, i) => largeTable.setBigUint64(i * 8, BigInt(offset)));
  return concat(head, idBytes, crcs, new Uint8Array(small.buffer), new Uint8Array(largeTable.buffer), new Uint8Array(40));
}

export interface RepoFiles {
  head?: string;
  /** Loose objects: id → [type, data]. */
  loose?: Record<string, [string, Uint8Array | string]>;
  refs?: Record<string, string>;
  packedRefs?: string;
  packs?: Record<string, { pack: Uint8Array; idx: Uint8Array }>;
  config?: string;
  /** `.git/index` bytes (see buildIndex) and its modified time in ms. */
  index?: Uint8Array;
  indexMtimeMs?: number;
  /** `.git/info/exclude`. */
  exclude?: string;
}

/** A vault folder with a `.git` laid out from `files`. */
export async function makeRepoVault(files: RepoFiles): Promise<MemoryDirectoryHandle> {
  const vault = new MemoryDirectoryHandle("vault");
  const git = await vault.getDirectoryHandle(".git", { create: true });
  if (files.head !== undefined) await git.writeText("HEAD", files.head);
  if (files.config !== undefined) await git.writeText("config", files.config);
  if (files.packedRefs !== undefined) await git.writeText("packed-refs", files.packedRefs);
  if (files.index) {
    const index = await git.writeText("index", "");
    index.bytes = files.index;
    index.lastModified = files.indexMtimeMs ?? 0;
  }
  if (files.exclude !== undefined) await git.writeText("info/exclude", files.exclude);
  for (const [ref, id] of Object.entries(files.refs ?? {})) await git.writeText(ref, id + "\n");
  for (const [id, [type, data]] of Object.entries(files.loose ?? {})) {
    const file = await git.writeText("objects/" + id.slice(0, 2) + "/" + id.slice(2), "");
    file.bytes = looseObject(type, data);
  }
  for (const [name, { pack, idx }] of Object.entries(files.packs ?? {})) {
    (await git.writeText("objects/pack/" + name + ".pack", "")).bytes = pack;
    (await git.writeText("objects/pack/" + name + ".idx", "")).bytes = idx;
  }
  return vault;
}

export interface IndexEntryInput {
  path: string;
  id: string;
  size?: number;
  mtimeSec?: number;
  mode?: number;
  stage?: number;
  /** Writes the extended-flags word (version 3+). */
  extended?: boolean;
}

/** `.git/index` bytes for `entries` (sorted by the caller) in `version` 2, 3 or 4. */
export function buildIndex(entries: IndexEntryInput[], version: 2 | 3 | 4): Uint8Array {
  const header = new DataView(new ArrayBuffer(12));
  header.setUint32(0, 0x44495243);
  header.setUint32(4, version);
  header.setUint32(8, entries.length);
  const parts: Uint8Array[] = [new Uint8Array(header.buffer)];
  let previous = "";
  for (const entry of entries) {
    const fixed = new DataView(new ArrayBuffer(62));
    fixed.setUint32(8, entry.mtimeSec ?? 0);
    fixed.setUint32(24, entry.mode ?? 0o100644);
    fixed.setUint32(36, entry.size ?? 0);
    const name = encoder.encode(entry.path);
    const flags = ((entry.stage ?? 0) << 12) | (entry.extended ? 0x4000 : 0) | Math.min(name.length, 0xfff);
    fixed.setUint16(60, flags);
    let body = concat(new Uint8Array(fixed.buffer, 0, 40), hexBytes(entry.id), new Uint8Array(fixed.buffer, 60, 2));
    if (entry.extended) body = concat(body, new Uint8Array(2));
    if (version === 4) {
      let common = 0;
      while (common < previous.length && common < entry.path.length && previous[common] === entry.path[common]) common++;
      const strip = previous.length - common;
      // Offset varint, the inverse of the reader's.
      const varint = [strip & 127];
      let rest = strip >> 7;
      while (rest > 0) {
        rest -= 1;
        varint.unshift(128 | (rest & 127));
        rest >>= 7;
      }
      parts.push(concat(body, Uint8Array.from(varint), encoder.encode(entry.path.slice(common)), new Uint8Array(1)));
    } else {
      const length = body.length + name.length + 1;
      parts.push(concat(body, name, new Uint8Array(Math.ceil(length / 8) * 8 - body.length - name.length)));
    }
    previous = entry.path;
  }
  parts.push(new Uint8Array(20));
  return concat(...parts);
}
