"use client";

import React from "react";
import { useAtom, useAtomValue } from "jotai";
import { TbGitCompare } from "react-icons/tb";
import { atom_gitAvailable, atom_showGitChanges } from "@/app/atoms/git-atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";

// Shows or hides the Git Changes diff (atom_showGitChanges, as the palette
// and Settings → Editor → View): left of the outline toggle in the editor's
// top-right corner (EditorShell), in the pill's look, pressed while it's on.
export default function GitChangesToggleButton({ className = "" }: { className?: string }) {
  const [showGitChanges, setShowGitChanges] = useAtom(atom_showGitChanges);
  const gitAvailable = useAtomValue(atom_gitAvailable);
  const label = showGitChanges && gitAvailable === false ? "No .git folder at the vault's root" : showGitChanges ? "Hide Git Changes" : "Show Git Changes";

  return (
    <Tooltip label={label} position="bottom" portal>
      <Button
        variant="unstyled"
        onClick={() => setShowGitChanges(!showGitChanges)}
        aria-label="Git Changes"
        aria-pressed={showGitChanges}
        className={`${PILL_BUTTON_CLASS} ${showGitChanges ? "!bg-black/[0.1] !text-fg dark:!bg-white/[0.14]" : ""} ${className}`}
      >
        <TbGitCompare size={14} aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}
