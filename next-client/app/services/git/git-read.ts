// The two reads the editor needs, shared by the git-read worker and the
// client's no-Worker fallback: where HEAD is, and HEAD's text for one file.
import { openRepo, type GitRepo } from "./git-repo";
import { resolveHead } from "./git-refs";
import { classifyBytes } from "./git-classify";
import { blobAtPath } from "./git-tree";

export interface HeadResult {
  available: boolean;
  commit: string | null;
  stamp: string;
}

export interface BlobResult {
  status: "ok" | "missing" | "binary" | "too-large" | "error";
  text?: string;
}

const warned = new Set<string>();
const repos = new WeakMap<FileSystemDirectoryHandle, Promise<GitRepo | null>>();

function repoFor(vault: FileSystemDirectoryHandle): Promise<GitRepo | null> {
  let repo = repos.get(vault);
  // A vault that isn't a repo is looked up again each time, so `git init` shows up.
  if (!repo) {
    repo = openRepo(vault).then((found) => {
      if (!found) repos.delete(vault);
      return found;
    });
    repos.set(vault, repo);
  }
  return repo;
}

export async function readHead(vault: FileSystemDirectoryHandle): Promise<HeadResult> {
  try {
    const repo = await repoFor(vault);
    if (!repo) return { available: false, commit: null, stamp: "" };
    return { available: true, ...(await resolveHead(repo.gitDir)) };
  } catch {
    return { available: false, commit: null, stamp: "" };
  }
}

export async function readHeadBlob(vault: FileSystemDirectoryHandle, commit: string, path: string): Promise<BlobResult> {
  try {
    const repo = await repoFor(vault);
    if (!repo) return { status: "error" };
    const bytes = await blobAtPath(repo.gitDir, commit, path);
    if (!bytes) return { status: "missing" };
    const kind = classifyBytes(bytes);
    if (kind !== "ok") return { status: kind };
    return { status: "ok", text: new TextDecoder("utf-8", { fatal: false }).decode(bytes) };
  } catch (error) {
    const key = commit + ":" + path;
    if (!warned.has(key)) {
      warned.add(key);
      console.warn("git: could not read " + path + " at " + commit, error);
    }
    return { status: "error" };
  }
}
