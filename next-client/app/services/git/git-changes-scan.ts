// The Changes page's scan: every file in the vault that differs from HEAD,
// with its line diff. Compares HEAD's tree with the working files; the index
// lets a file whose size and mtime still match skip reading, everything else
// is hashed as a git blob. Git keeps no record of working-tree edits, so every
// working file is looked at (as `git status` does); HEAD's file list comes
// from the index when its cache tree is HEAD's tree (so no tree is read). Runs in workers/git-changes.worker.ts. Read only.
import { SKIPPED_DIRS, isSecretFile } from "@/app/hooks/file-system/vault-scan";
import { isTrashPath } from "@/app/services/vault-trash";
import type { ChangedFile, ChangesProgress, ChangesResult, FileStatus } from "./git-changes-types";
import { classifyBytes } from "./git-classify";
import { buildFileDiff, splitLines } from "./git-file-diff";
import { blobId } from "./git-hash";
import { readIndex, type GitIndex } from "./git-index";
import { MAX_GIT_LINES } from "./git-line-diff";
import { readObject } from "./git-objects";
import { resolveHead } from "./git-refs";
import { openRepo } from "./git-repo";
import { readTextAt } from "./git-fs";
import { listTreeFiles, treeIdOf, type TreeListing } from "./git-tree";
import { walkWorktree } from "./git-worktree";

/** Diffs sent past either limit become `skipped` (their counts stay). */
export const MAX_DIFF_FILES = 300;
export const MAX_DIFF_LINES = 100000;
const PROGRESS_MS = 100;
const COMPARE_CONCURRENCY = 8;

/**
 * Blob ids of working files hashed by earlier scans, by path, with the size
 * and mtime they had. The page rescans on every window focus; a file that
 * hasn't changed since is then neither read nor hashed again, even when the
 * index's stat doesn't match it (files edited since the last `git add`).
 * Kept for one vault (the last scanned).
 */
let hashed: { vault: FileSystemDirectoryHandle; ids: Map<string, { size: number; mtime: number; id: string }> } | null = null;

async function sameVault(a: FileSystemDirectoryHandle, b: FileSystemDirectoryHandle): Promise<boolean> {
  if (a === b) return true;
  try {
    return await a.isSameEntry(b); // each scan gets its own copy of the handle
  } catch {
    return false;
  }
}

async function hashCacheFor(vault: FileSystemDirectoryHandle) {
  if (!hashed || !(await sameVault(hashed.vault, vault))) hashed = { vault, ids: new Map() };
  return hashed.ids;
}

/** HEAD's file list for the last commit scanned (a commit's tree never changes). */
let headCache: { commit: string; listing: Promise<TreeListing> } | null = null;

/** Clears the scan's blob id and HEAD caches (tests). */
export function clearScanCache(): void {
  hashed = null;
  headCache = null;
}

/** The index's files as a tree listing (the same paths `listTreeFiles` keeps). */
function listingFromIndex(index: GitIndex): TreeListing {
  const listing: TreeListing = { files: new Map(), submodules: new Set() };
  for (const [path, entry] of index.entries) {
    if (entry.mode === 0o160000) listing.submodules.add(path);
    else if (entry.mode === 0o100644 || entry.mode === 0o100755) listing.files.set(path, { id: entry.id, mode: entry.mode.toString(8) });
  }
  return listing;
}

/**
 * HEAD's files. After a commit, checkout or reset the index's cache tree is
 * HEAD's tree, so the index already lists HEAD and no tree is read from the
 * packs; otherwise the tree is walked once per commit.
 */
async function headFiles(gitDir: FileSystemDirectoryHandle, commit: string, index: GitIndex | null): Promise<TreeListing> {
  if (headCache?.commit === commit) return headCache.listing;
  const conflicted = index ? [...index.entries.values()].some((entry) => entry.stage !== 0) : true;
  if (index?.rootTree && !conflicted && (await treeIdOf(gitDir, commit)) === index.rootTree) return listingFromIndex(index);
  const listing = listTreeFiles(gitDir, commit);
  headCache = { commit, listing };
  listing.catch(() => {
    if (headCache?.listing === listing) headCache = null;
  });
  return listing;
}

export interface KnownFile {
  path: string;
  handle: FileSystemFileHandle;
}

export interface ScanOptions {
  onProgress(progress: ChangesProgress): void;
  /** Changed files as they're found, in batches, before the sorted result. */
  onFiles?(files: ChangedFile[]): void;
  /**
   * Handles the app's own vault scan already holds (notes and text files):
   * the tracked ones are compared first, before the walk reaches them, since
   * listing folders is slow on some devices.
   */
  known?: readonly KnownFile[];
  isCancelled(): boolean;
}

const decode = (bytes: Uint8Array) => new TextDecoder("utf-8", { fatal: false }).decode(bytes);

function ancestors(path: string): string[] {
  const parts = path.split("/");
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join("/"));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

/** Whether `path` sits under one of `dirs` or is a folder the walk never reports. */
function isExcludedPath(path: string, dirs: string[]): boolean {
  const parts = path.split("/");
  if (parts.slice(0, -1).some((part) => SKIPPED_DIRS.has(part))) return true;
  if (isTrashPath(path) || isSecretFile(parts[parts.length - 1])) return true;
  return dirs.some((dir) => path.startsWith(dir + "/"));
}

class Budget {
  private files = 0;
  private lines = 0;
  /** Whether another diff still fits; counts it when it does. */
  take(size: number): boolean {
    if (this.files >= MAX_DIFF_FILES || this.lines >= MAX_DIFF_LINES) return false;
    this.files++;
    this.lines += size;
    return true;
  }
}

/** Builds one file's entry from the old and new bytes (null: that side doesn't exist). Null: not a change. */
function describe(path: string, status: FileStatus, oldBytes: Uint8Array | null, newBytes: Uint8Array | null, budget: Budget): ChangedFile | null {
  const kinds = [oldBytes, newBytes].map((bytes) => (bytes ? classifyBytes(bytes) : "ok"));
  if (kinds.includes("binary")) return { path, status, added: null, removed: null, diff: { kind: "binary" } };
  const oldText = oldBytes ? decode(oldBytes) : null;
  const newText = newBytes ? decode(newBytes) : null;
  const tooLarge = kinds.includes("too-large") || [oldText, newText].some((text) => text !== null && splitLines(text).length > MAX_GIT_LINES);
  if (tooLarge) {
    const count = (text: string | null) => (text === null ? 0 : splitLines(text).length);
    // Only a whole-file add or delete has counts without a diff.
    const known = status !== "modified" && !kinds.includes("too-large");
    return { path, status, added: known ? count(newText) : null, removed: known ? count(oldText) : null, diff: { kind: "too-large" } };
  }
  const diff = buildFileDiff(status === "added" ? null : oldText, status === "deleted" ? null : newText);
  if (status === "modified" && diff.changes.length === 0) return null; // line endings only
  const added = diff.changes.reduce((total, change) => total + change.newCount, 0);
  const removed = diff.changes.reduce((total, change) => total + change.removed.length, 0);
  const fits = budget.take(diff.lines.length + removed);
  return { path, status, added, removed, diff: fits ? diff : { kind: "skipped" } };
}

/** The index's submodule paths (gitlink entries). */
function gitlinks(index: GitIndex): Set<string> {
  const paths = new Set<string>();
  for (const [path, entry] of index.entries) if (entry.mode === 0o160000) paths.add(path);
  return paths;
}

/** Runs at most `n` of the functions given to it at once. */
function limiter(n: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return (run: () => Promise<void>): Promise<void> =>
    new Promise((resolve) => {
      const start = () => {
        active++;
        run()
          .catch((error) => console.warn("git: could not compare a file", error))
          .finally(() => {
            active--;
            waiting.shift()?.();
            resolve();
          });
      };
      if (active < n) start();
      else waiting.push(start);
    });
}

/** A path found to differ, with its bytes, waiting for its diff. */
interface Candidate {
  path: string;
  status: FileStatus;
  oldBytes: Uint8Array | null;
  newBytes: Uint8Array | null;
}

function unchangedByIndex(index: GitIndex | null, path: string, baseId: string, file: File): "same" | "differs" | "unknown" {
  const entry = index?.entries.get(path);
  if (!index || !entry || entry.stage !== 0 || entry.id !== baseId) return "unknown";
  if (entry.size !== file.size) return "differs";
  const seconds = Math.floor(file.lastModified / 1000);
  // A file touched in the second the index was written may have changed after (racy git).
  return entry.mtimeSec === seconds && seconds < Math.floor(index.mtimeMs / 1000) ? "same" : "unknown";
}

export async function scanChanges(vault: FileSystemDirectoryHandle, options: ScanOptions): Promise<ChangesResult | "cancelled"> {
  try {
    const repo = await openRepo(vault);
    if (!repo) return { status: "no-repo" };
    const { gitDir } = repo;
    const { commit } = await resolveHead(gitDir);
    const index = await readIndex(gitDir).catch(() => null);
    // HEAD's file list loads while the vault is walked. The walk needs the
    // tracked paths only for ignore rules, and like git it takes them from the
    // index; without an index it waits for HEAD.
    const headReady = commit ? headFiles(gitDir, commit, index) : Promise.resolve<TreeListing>({ files: new Map(), submodules: new Set() });
    headReady.catch(() => {}); // awaited below; this only keeps an early failure from going unhandled
    const exclude = await readTextAt(gitDir, "info/exclude");
    const tracked = new Set<string>(index ? index.entries.keys() : (await headReady).files.keys());
    const trackedDirs = new Set<string>();
    for (const path of tracked) for (const dir of ancestors(path)) trackedDirs.add(dir);
    const ids = await hashCacheFor(vault);

    let lastReport = 0;
    const report = (progress: ChangesProgress, force = false) => {
      const now = Date.now();
      if (!force && now - lastReport < PROGRESS_MS) return;
      lastReport = now;
      options.onProgress(progress);
    };

    // Found files go to the page as they come (a batch per PROGRESS_MS).
    const files = new Map<string, ChangedFile>();
    let unsent: ChangedFile[] = [];
    let lastSent = 0;
    const send = (force = false) => {
      if (unsent.length === 0 || (!force && Date.now() - lastSent < PROGRESS_MS)) return;
      lastSent = Date.now();
      options.onFiles?.(unsent);
      unsent = [];
    };

    // Whether `file` (undefined: not in the vault) differs from the blob
    // `baseId` (undefined: not in the base). Null: it doesn't.
    const compareTo = async (path: string, file: File | undefined, baseId: string | undefined): Promise<Candidate | ChangedFile | null> => {
      try {
        const baseBytes = async () => (await readObject(gitDir, baseId!)).data;
        if (file && !baseId) return { path, status: "added", oldBytes: null, newBytes: new Uint8Array(await file.arrayBuffer()) };
        if (!file && baseId) return { path, status: "deleted", oldBytes: await baseBytes(), newBytes: null };
        if (!file || !baseId) return null;
        const fast = unchangedByIndex(index, path, baseId, file);
        if (fast === "same") return null;
        const known = ids.get(path);
        if (fast === "unknown" && known?.size === file.size && known.mtime === file.lastModified && known.id === baseId) return null;
        const bytes = new Uint8Array(await file.arrayBuffer());
        let before: Uint8Array | null = null;
        if (fast === "unknown") {
          const id = await blobId(bytes);
          if (id === null) {
            before = await baseBytes();
            if (sameBytes(before, bytes)) return null;
          } else {
            ids.set(path, { size: file.size, mtime: file.lastModified, id });
            if (id === baseId) return null;
          }
        }
        return { path, status: "modified", oldBytes: before ?? (await baseBytes()), newBytes: bytes };
      } catch (error) {
        console.warn("git: could not compare " + path, error);
        return { path, status: file ? (baseId ? "modified" : "added") : "deleted", added: null, removed: null, diff: { kind: "error" } };
      }
    };

    // Each file is compared as soon as the walk finds it, several at a time
    // (reading and hashing dominate). A file in the index is compared with
    // the index's blob at once: that's HEAD's for almost every file, and
    // HEAD's tree (read from packs) may still be loading. Once it's read, the
    // few whose index blob isn't HEAD's (staged changes) are compared again.
    // The diff budget goes to files in the order they're found.
    const budget = new Budget();
    const limit = limiter(COMPARE_CONCURRENCY);
    const tasks: Promise<void>[] = [];
    const againstIndex = new Map<string, string>();
    let queued = 0;
    let compared = 0;
    // A path's later comparison (against HEAD) runs after its first, so it has the last word.
    const byPath = new Map<string, Promise<void>>();
    const enqueue = (path: string, file: File | undefined | (() => Promise<File | undefined>), base: () => Promise<string | undefined>) => {
      queued++;
      const task = (byPath.get(path) ?? Promise.resolve()).then(() =>
        limit(async () => {
          if (options.isCancelled()) return;
          const item = await compareTo(path, typeof file === "function" ? await file() : file, await base());
          compared++;
          const entry = item && ("diff" in item ? item : describe(item.path, item.status, item.oldBytes, item.newBytes, budget));
          if (entry) {
            files.set(path, entry);
            unsent.push(entry);
            send();
          } else {
            files.delete(path);
          }
        }),
      );
      byPath.set(path, task);
      tasks.push(task);
    };
    const headId = async (path: string) => (await headReady).files.get(path)?.id;
    // Tracked files the app already has handles for go first; the walk reuses their reads.
    const early = new Map<string, () => Promise<File | undefined>>();
    for (const { path, handle } of options.known ?? []) {
      const entry = index?.entries.get(path);
      if (!entry || entry.stage !== 0 || early.has(path)) continue;
      let read: Promise<File | undefined> | null = null;
      const file = () => (read ??= handle.getFile().then((found) => found, () => undefined));
      early.set(path, file);
      againstIndex.set(path, entry.id);
      enqueue(path, file, async () => entry.id);
    }
    const onWalked = (path: string, file: File) => {
      if (early.has(path)) return; // compared already
      const entry = index?.entries.get(path);
      if (entry && entry.stage === 0) {
        againstIndex.set(path, entry.id);
        enqueue(path, file, async () => entry.id);
      } else {
        enqueue(path, file, () => headId(path));
      }
    };

    let walking = true;
    const tree = await walkWorktree(vault, {
      tracked,
      trackedDirs,
      submodules: index ? gitlinks(index) : (await headReady).submodules,
      exclude,
      isCancelled: options.isCancelled,
      onFile: onWalked,
      fileFor: (path, handle) => early.get(path)?.() ?? handle.getFile(),
      onListed: (count) => walking && report({ phase: "listing", done: count, total: 0 }),
    });
    walking = false;
    if (options.isCancelled()) return "cancelled";

    // HEAD's paths the walk didn't find are deleted, unless they sit where the walk doesn't look.
    const head = await headReady;
    const hiddenDirs = [...tree.failedDirs, ...tree.nestedDirs, ...head.submodules];
    for (const [path, { id }] of head.files) {
      if (tree.files.has(path) || isExcludedPath(path, hiddenDirs)) continue;
      enqueue(path, undefined, async () => id);
    }
    for (const [path, indexId] of againstIndex) {
      const inHead = head.files.get(path)?.id;
      if (inHead !== indexId) enqueue(path, tree.files.get(path), async () => inHead);
    }
    // A submodule's folder (known only once HEAD is read) was walked as files: those aren't changes.
    const inSubmodule = (path: string) => [...head.submodules].some((dir) => path === dir || path.startsWith(dir + "/"));
    const progress = setInterval(() => report({ phase: "comparing", done: compared, total: queued }), PROGRESS_MS);
    try {
      for (let i = 0; i < tasks.length; i++) await tasks[i];
    } finally {
      clearInterval(progress);
    }
    if (options.isCancelled()) return "cancelled";
    send(true);
    const result = [...files.values()].filter((file) => !inSubmodule(file.path)).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    return { status: "ok", commit, files: result };
  } catch (error) {
    console.warn("git: could not scan for changes", error);
    const { name, message } = error instanceof Error || error instanceof DOMException ? error : { name: "Error", message: String(error) };
    return { status: "error", detail: `${name}: ${message}` };
  }
}
