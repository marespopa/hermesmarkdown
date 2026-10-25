// Reads one git object by id: loose (`objects/aa/bbbb…`, a zlib stream) or
// from a pack. Objects are immutable, so they are kept in a small LRU cache.
import { unzlibSync } from "fflate";
import { getFileAt, readBytes, GitNotFoundError } from "./git-fs";
import { clearPackIndexCache, findInPacks, readPackEntry, type GitObject, type GitObjectType } from "./git-pack";

export type { GitObject, GitObjectType };

const MAX_OBJECTS = 64;
const MAX_BYTES = 16 * 1024 * 1024;

const cache = new Map<string, GitObject>();
let cachedBytes = 0;

function remember(id: string, object: GitObject): void {
  if (object.data.length > MAX_BYTES / 2) return;
  cache.set(id, object);
  cachedBytes += object.data.length;
  for (const [oldest, old] of cache) {
    if (cache.size <= MAX_OBJECTS && cachedBytes <= MAX_BYTES) break;
    cache.delete(oldest);
    cachedBytes -= old.data.length;
  }
}

export function clearObjectCache(): void {
  cache.clear();
  cachedBytes = 0;
  clearPackIndexCache();
}

async function readLoose(gitDir: FileSystemDirectoryHandle, id: string): Promise<GitObject | null> {
  const file = await getFileAt(gitDir, "objects/" + id.slice(0, 2) + "/" + id.slice(2));
  if (!file) return null;
  const raw = unzlibSync(await readBytes(file));
  const nul = raw.indexOf(0);
  const header = new TextDecoder().decode(raw.subarray(0, nul));
  return { type: header.split(" ")[0] as GitObjectType, data: raw.subarray(nul + 1) };
}

export async function readObject(gitDir: FileSystemDirectoryHandle, id: string): Promise<GitObject> {
  const hit = cache.get(id);
  if (hit) {
    cache.delete(id);
    cache.set(id, hit);
    return hit;
  }
  let object = await readLoose(gitDir, id);
  if (!object) {
    const found = await findInPacks(gitDir, id);
    if (!found) throw new GitNotFoundError(id);
    object = await readPackEntry(found.pack, found.offset, (baseId) => readObject(gitDir, baseId));
  }
  remember(id, object);
  return object;
}
