// Resolves HEAD to a commit id by reading `.git/HEAD`, the ref file and
// `packed-refs`. `stamp` changes whenever HEAD moves, so callers can check
// cheaply (two small reads) before re-reading a blob.
import { getFileAt } from "./git-fs";

export interface HeadInfo {
  /** The commit id, or null when there are no commits yet. */
  commit: string | null;
  stamp: string;
}

const HEX_ID = /^[0-9a-f]{40}$/i;
const LOCAL_BRANCH_PREFIX = "ref: refs/heads/";

/** Returns the local branch named by HEAD, excluding detached and unborn heads. */
export function branchNameFromHead(head: string): string | null {
  if (!head.startsWith(LOCAL_BRANCH_PREFIX)) return null;
  const branch = head.slice(LOCAL_BRANCH_PREFIX.length).trim();
  return branch && !/\s/.test(branch) ? branch : null;
}

export async function readBranchName(gitDir: FileSystemDirectoryHandle): Promise<string | null> {
  const headFile = await getFileAt(gitDir, "HEAD");
  return headFile ? branchNameFromHead(await headFile.text()) : null;
}

async function readPackedRef(gitDir: FileSystemDirectoryHandle, ref: string): Promise<{ id: string | null; stamp: string }> {
  const file = await getFileAt(gitDir, "packed-refs");
  if (!file) return { id: null, stamp: "" };
  const stamp = "packed:" + file.lastModified;
  const text = await file.text();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line[0] === "#" || line[0] === "^") continue;
    const space = line.indexOf(" ");
    if (space !== -1 && line.slice(space + 1).trim() === ref) return { id: line.slice(0, space), stamp };
  }
  return { id: null, stamp };
}

export async function resolveHead(gitDir: FileSystemDirectoryHandle): Promise<HeadInfo> {
  const headFile = await getFileAt(gitDir, "HEAD");
  const head = headFile ? (await headFile.text()).trim() : "";
  if (HEX_ID.test(head)) return { commit: head.toLowerCase(), stamp: head };
  if (!head.startsWith("ref:")) return { commit: null, stamp: head };
  const ref = head.slice(4).trim();
  const refFile = await getFileAt(gitDir, ref);
  if (refFile) {
    const id = (await refFile.text()).trim();
    return { commit: HEX_ID.test(id) ? id.toLowerCase() : null, stamp: [head, refFile.lastModified, id].join("|") };
  }
  const packed = await readPackedRef(gitDir, ref);
  const commit = packed.id && HEX_ID.test(packed.id) ? packed.id.toLowerCase() : null;
  return { commit, stamp: [head, packed.stamp, packed.id ?? ""].join("|") };
}
