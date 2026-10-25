// Lists the working files of a vault the way `git status` sees them: every
// file, dotfiles included, minus ignored untracked paths (each folder's
// `.gitignore` plus `.git/info/exclude`), tool folders, the Trash, secret
// files, submodules and nested repositories. Read only.
import ignore, { type Ignore } from "ignore";
import { isSecretFile, SKIPPED_DIRS } from "@/app/hooks/file-system/vault-scan";
import { isTrashPath } from "@/app/services/vault-trash";

const WALK_CONCURRENCY = 8;

export interface WorktreeOptions {
  /** Paths in HEAD or the index: never ignored. */
  tracked: Set<string>;
  /** Every ancestor folder of a tracked path: an ignored folder is walked only if listed here. */
  trackedDirs: Set<string>;
  submodules: Set<string>;
  /** `.git/info/exclude` text. */
  exclude: string | null;
  isCancelled(): boolean;
  onListed(count: number): void;
}

export interface Worktree {
  files: Map<string, File>;
  /** Folders that couldn't be listed: files under them are neither walked nor reported deleted. */
  failedDirs: string[];
  /** Subfolders holding their own `.git`: not part of this repository, so not walked. */
  nestedDirs: string[];
}

interface IgnoreLevel {
  base: string; // "" or "notes/"
  ig: Ignore;
}

interface Pending {
  handle: FileSystemDirectoryHandle;
  path: string; // "" or "notes"
  levels: IgnoreLevel[];
}

function isIgnored(levels: IgnoreLevel[], path: string, isDir: boolean): boolean {
  for (let i = levels.length - 1; i >= 0; i--) {
    const relative = path.slice(levels[i].base.length) + (isDir ? "/" : "");
    const result = levels[i].ig.test(relative);
    if (result.ignored || result.unignored) return result.ignored;
  }
  return false;
}

async function listEntries(handle: FileSystemDirectoryHandle): Promise<FileSystemHandle[]> {
  const entries: FileSystemHandle[] = [];
  for await (const entry of (handle as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) entries.push(entry);
  return entries;
}

async function gitignoreOf(entries: FileSystemHandle[]): Promise<string | null> {
  const entry = entries.find((candidate) => candidate.kind === "file" && candidate.name === ".gitignore");
  if (!entry) return null;
  try {
    return await (await (entry as FileSystemFileHandle).getFile()).text();
  } catch {
    return null;
  }
}

export async function walkWorktree(vault: FileSystemDirectoryHandle, options: WorktreeOptions): Promise<Worktree> {
  const files = new Map<string, File>();
  const failedDirs: string[] = [];
  const nestedDirs: string[] = [];
  const queue: Pending[] = [{ handle: vault, path: "", levels: [{ base: "", ig: ignore().add(options.exclude ?? "") }] }];

  async function visit({ handle, path, levels }: Pending): Promise<void> {
    let entries: FileSystemHandle[];
    try {
      entries = await listEntries(handle);
    } catch {
      failedDirs.push(path);
      return;
    }
    // A nested repository (its root is the vault root itself, whose .git is a skipped folder).
    if (path !== "" && entries.some((entry) => entry.name === ".git")) {
      nestedDirs.push(path);
      return;
    }
    const text = await gitignoreOf(entries);
    const scoped = text === null ? levels : [...levels, { base: path ? path + "/" : "", ig: ignore().add(text) }];
    const reads: Promise<void>[] = [];
    for (const entry of entries) {
      if (options.isCancelled()) return;
      const childPath = path ? path + "/" + entry.name : entry.name;
      if (entry.kind === "directory") {
        if (SKIPPED_DIRS.has(entry.name) || isTrashPath(childPath) || options.submodules.has(childPath)) continue;
        if (isIgnored(scoped, childPath, true) && !options.tracked.has(childPath) && !options.trackedDirs.has(childPath)) continue;
        queue.push({ handle: entry as FileSystemDirectoryHandle, path: childPath, levels: scoped });
      } else {
        if (isSecretFile(entry.name)) continue;
        if (!options.tracked.has(childPath) && isIgnored(scoped, childPath, false)) continue;
        // A folder's files are read at once: one at a time is most of a large walk.
        reads.push(
          (entry as FileSystemFileHandle).getFile().then(
            (file) => void files.set(childPath, file),
            () => {}, // A file that vanished or can't be read: treated as absent.
          ),
        );
      }
    }
    await Promise.all(reads);
    options.onListed(files.size);
  }

  async function worker(): Promise<void> {
    while (!options.isCancelled()) {
      const next = queue.pop();
      if (!next) return;
      await visit(next);
    }
  }

  // Workers that find the queue empty exit, so loop until a pass adds nothing.
  while (queue.length > 0 && !options.isCancelled()) {
    await Promise.all(Array.from({ length: Math.min(WALK_CONCURRENCY, queue.length) }, worker));
  }
  return { files, failedDirs, nestedDirs };
}
