// Opens a vault's `.git` folder for reading. Only a `.git` directory at the
// vault root counts: a `.git` file (worktrees, submodules) and sha256
// repositories are unsupported. Any other failure (no permission, a read
// error) throws, so it isn't mistaken for "no repository".
import { readTextAt } from "./git-fs";

export interface GitRepo {
  gitDir: FileSystemDirectoryHandle;
}

export async function openRepo(vault: FileSystemDirectoryHandle): Promise<GitRepo | null> {
  let gitDir: FileSystemDirectoryHandle;
  try {
    gitDir = await vault.getDirectoryHandle(".git");
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === "NotFoundError" || name === "TypeMismatchError") return null;
    throw error;
  }
  const config = await readTextAt(gitDir, "config");
  if (config && /^\s*objectformat\s*=\s*sha256\s*$/im.test(config)) return null;
  return { gitDir };
}
