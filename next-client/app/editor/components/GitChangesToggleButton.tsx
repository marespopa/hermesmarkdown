"use client";

import React from "react";
import { useAtom, useAtomValue } from "jotai";
import { TbGitCompare } from "react-icons/tb";
import { atom_gitAvailable, atom_gitLoading, atom_showGitChanges } from "@/app/atoms/git-atoms";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { useVaultHasGit } from "../hooks/use-vault-has-git";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";

// Shows or hides the Git Changes diff (atom_showGitChanges, as the palette
// and Settings → Editor → View): left of the outline toggle in the editor's
// top-right corner (EditorShell), in the pill's look, pressed while it's on.
// While HEAD's text is still being read, a ring spins around the icon (after
// a moment, so a quick read shows nothing). Shown only for a disk vault with
// a `.git` folder at its root; the palette and Settings keep the toggle.
export default function GitChangesToggleButton({ className = "" }: { className?: string }) {
  const [showGitChanges, setShowGitChanges] = useAtom(atom_showGitChanges);
  const gitAvailable = useAtomValue(atom_gitAvailable);
  const loadingCount = useAtomValue(atom_gitLoading);
  const loading = showGitChanges && loadingCount > 0;
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const isDiskVault = useAtomValue(atom_vaultDescriptor)?.kind === "local";
  const hasGit = useVaultHasGit(isDiskVault ? vaultHandle : null);
  const label = showGitChanges && gitAvailable === false ? "No .git folder at the vault's root" : showGitChanges ? "Hide Git Changes" : "Show Git Changes";

  if (!hasGit) return null;

  return (
    <Tooltip label={label} position="bottom" portal>
      <Button
        variant="unstyled"
        onClick={() => setShowGitChanges(!showGitChanges)}
        aria-label="Git Changes"
        aria-pressed={showGitChanges}
        aria-busy={loading || undefined}
        className={`${PILL_BUTTON_CLASS} relative ${showGitChanges ? "!bg-black/[0.1] !text-fg dark:!bg-white/[0.14]" : ""} ${className}`}
      >
        <TbGitCompare size={14} aria-hidden="true" />
        {loading && (
          <span aria-hidden="true" className="loading-bar-appear pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-[1.5px] border-fg-faint border-t-transparent motion-reduce:animate-none" />
          </span>
        )}
      </Button>
    </Tooltip>
  );
}
