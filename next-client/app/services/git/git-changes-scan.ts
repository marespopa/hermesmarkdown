// The Changes page's scan: every file in the vault that differs from HEAD,
// with its line diff. Compares HEAD's tree with the working files; the index
// lets a file whose size and mtime still match skip reading, everything else
// is hashed as a git blob. Runs in workers/git-changes.worker.ts. Read only.
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
import { listTreeFiles } from "./git-tree";
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

/** Clears the scan's blob id cache (tests). */
export function clearScanCache(): void {
  hashed = null;
}

export interface ScanOptions {
  onProgress(progress: ChangesProgress): void;
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

/** A path found to differ, with its bytes, waiting for its diff. */
interface Candidate {
  path: string;
  status: FileStatus;
  oldBytes: Uint8Array | null;
  newBytes: Uint8Array | null;
}

function unchangedByIndex(index: GitIndex | null, path: string, headId: string, file: File): "same" | "differs" | "unknown" {
  const entry = index?.entries.get(path);
  if (!index || !entry || entry.stage !== 0 || entry.id !== headId) return "unknown";
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
    const head = commit ? await listTreeFiles(gitDir, commit) : { files: new Map<string, { id: string; mode: string }>(), submodules: new Set<string>() };
    const index = await readIndex(gitDir).catch(() => null);
    const exclude = await readTextAt(gitDir, "info/exclude");
    const tracked = new Set<string>(head.files.keys());
    if (index) for (const path of index.entries.keys()) tracked.add(path);
    const trackedDirs = new Set<string>();
    for (const path of tracked) for (const dir of ancestors(path)) trackedDirs.add(dir);

    let lastReport = 0;
    const report = (progress: ChangesProgress, force = false) => {
      const now = Date.now();
      if (!force && now - lastReport < PROGRESS_MS) return;
      lastReport = now;
      options.onProgress(progress);
    };
    const tree = await walkWorktree(vault, {
      tracked,
      trackedDirs,
      submodules: head.submodules,
      exclude,
      isCancelled: options.isCancelled,
      onListed: (count) => report({ phase: "listing", done: count, total: 0 }),
    });
    if (options.isCancelled()) return "cancelled";

    const hiddenDirs = [...tree.failedDirs, ...tree.nestedDirs, ...head.submodules];
    const paths = [...new Set([...head.files.keys(), ...tree.files.keys()])].filter((path) => tree.files.has(path) || !isExcludedPath(path, hiddenDirs)).sort();
    const ids = await hashCacheFor(vault);

    // Which paths differ, several at a time: reading and hashing dominate.
    const found: (Candidate | ChangedFile | null)[] = new Array(paths.length).fill(null);
    let done = 0;
    const compare = async (path: string): Promise<Candidate | ChangedFile | null> => {
      try {
        const file = tree.files.get(path);
        const inHead = head.files.get(path);
        const headBytes = async () => (await readObject(gitDir, inHead!.id)).data;
        if (file && !inHead) return { path, status: "added", oldBytes: null, newBytes: new Uint8Array(await file.arrayBuffer()) };
        if (!file && inHead) return { path, status: "deleted", oldBytes: await headBytes(), newBytes: null };
        if (!file || !inHead) return null;
        const fast = unchangedByIndex(index, path, inHead.id, file);
        if (fast === "same") return null;
        const known = ids.get(path);
        if (fast === "unknown" && known?.size === file.size && known.mtime === file.lastModified && known.id === inHead.id) return null;
        const bytes = new Uint8Array(await file.arrayBuffer());
        let before: Uint8Array | null = null;
        if (fast === "unknown") {
          const id = await blobId(bytes);
          if (id === null) {
            before = await headBytes();
            if (sameBytes(before, bytes)) return null;
          } else {
            ids.set(path, { size: file.size, mtime: file.lastModified, id });
            if (id === inHead.id) return null;
          }
        }
        return { path, status: "modified", oldBytes: before ?? (await headBytes()), newBytes: bytes };
      } catch (error) {
        console.warn("git: could not compare " + path, error);
        return { path, status: tree.files.has(path) ? (head.files.has(path) ? "modified" : "added") : "deleted", added: null, removed: null, diff: { kind: "error" } };
      }
    };
    let next = 0;
    const worker = async () => {
      while (next < paths.length && !options.isCancelled()) {
        const i = next++;
        report({ phase: "comparing", done, total: paths.length });
        found[i] = await compare(paths[i]);
        done++;
      }
    };
    await Promise.all(Array.from({ length: COMPARE_CONCURRENCY }, worker));
    if (options.isCancelled()) return "cancelled";

    // Diffs in path order, so the budget keeps the first files' diffs.
    const budget = new Budget();
    const files: ChangedFile[] = [];
    for (const item of found) {
      if (!item) continue;
      const entry = "diff" in item ? item : describe(item.path, item.status, item.oldBytes, item.newBytes, budget);
      if (entry) files.push(entry);
    }
    return { status: "ok", commit, files };
  } catch (error) {
    console.warn("git: could not scan for changes", error);
    const { name, message } = error instanceof Error || error instanceof DOMException ? error : { name: "Error", message: String(error) };
    return { status: "error", detail: `${name}: ${message}` };
  }
}
