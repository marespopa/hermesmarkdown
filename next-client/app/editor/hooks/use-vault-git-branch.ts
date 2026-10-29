"use client";

import { useEffect, useState } from "react";
import { readBranchName } from "@/app/services/git/git-refs";
import { openRepo } from "@/app/services/git/git-repo";

// The active vault's named local branch. Refresh on window focus, so a branch
// switch in another app appears without reopening the vault.
export function useVaultGitBranch(vault: FileSystemDirectoryHandle | null): string | null | undefined {
  const [result, setResult] = useState<{ vault: FileSystemDirectoryHandle; branch: string | null } | null>(null);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    const check = async () => {
      try {
        const repo = await openRepo(vault);
        const branch = repo ? await readBranchName(repo.gitDir) : null;
        if (!cancelled) setResult({ vault, branch });
      } catch (error) {
        console.error("Couldn't read the Git branch.", error);
        if (!cancelled) setResult({ vault, branch: null });
      }
    };
    void check();
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", check);
    };
  }, [vault]);

  if (!vault) return null;
  // `undefined` distinguishes an in-flight lookup from a branchless repository.
  return result?.vault === vault ? result.branch : undefined;
}
