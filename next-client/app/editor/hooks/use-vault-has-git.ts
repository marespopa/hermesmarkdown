"use client";

import { useEffect, useState } from "react";

// Whether `vault` has a `.git` folder at its root: true / false once checked,
// null before (and for no vault). Checked again when the window regains focus,
// so a `git init` (or removing `.git`) shows up without reopening the vault.
// Only looks for the folder; the git reader decides whether it's usable.
export function useVaultHasGit(vault: FileSystemDirectoryHandle | null): boolean | null {
  const [found, setFound] = useState<{ vault: FileSystemDirectoryHandle; hasGit: boolean } | null>(null);

  useEffect(() => {
    if (!vault) return;
    let cancelled = false;
    const check = () => {
      vault.getDirectoryHandle(".git").then(
        () => !cancelled && setFound({ vault, hasGit: true }),
        () => !cancelled && setFound({ vault, hasGit: false }),
      );
    };
    check();
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", check);
    };
  }, [vault]);

  return vault && found?.vault === vault ? found.hasGit : null;
}
