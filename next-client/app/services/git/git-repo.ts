// Opens a vault's `.git` folder for reading. Only a `.git` directory at the
// vault root counts: a `.git` file (worktrees, submodules) and sha256
// repositories are unsupported.
import { readTextAt } from "./git-fs";

export interface GitRepo {
  gitDir: FileSystemDirectoryHandle;
}

export async function openRepo(vault: FileSystemDirectoryHandle): Promise<GitRepo | null> {
  let gitDir: FileSystemDirectoryHandle;
  try {
    gitDir = await vault.getDirectoryHandle(".git");
  } catch {
    return null;
  }
  const config = await readTextAt(gitDir, "config");
  if (config && /^\s*objectformat\s*=\s*sha256\s*$/im.test(config)) return null;
  return { gitDir };
}
