"use client";

import React, { useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { TbFileDiff, TbGitBranch, TbGitCompare, TbListDetails } from "react-icons/tb";
import { atom_gitAvailable, atom_gitLoading, atom_showGitChanges } from "@/app/atoms/git-atoms";
import { atom_isVaultPending, atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatPageShortcut, PAGE_SHORTCUTS, pageCommand, runPageCommand } from "@/app/components/CommandPalette/page-shortcuts";
import { useVaultHasGit } from "../hooks/use-vault-has-git";
import { useVaultGitBranch } from "../hooks/use-vault-git-branch";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";
import TabContextMenu, { type TabContextMenuItem } from "./TabContextMenu";

const CHANGES_SHORTCUT = PAGE_SHORTCUTS.find((shortcut) => shortcut.label === "Changes")!;

// The git menu: Show Changes (the vault's Changes page) and Git Changes in
// Note (the diff in the note, atom_showGitChanges, as the palette's Toggle
// Git Changes). Left of the outline toggle in the editor's
// top-right corner (EditorShell), in the pill's look, filled while the diff
// is on.
// While HEAD's text is still being read, a ring spins around the icon (after
// a moment, so a quick read shows nothing). Shown only for a disk vault with
// a `.git` folder at its root; the palette keeps the toggle.
export default function GitChangesToggleButton({ className = "" }: { className?: string }) {
  const [showGitChanges, setShowGitChanges] = useAtom(atom_showGitChanges);
  const gitAvailable = useAtomValue(atom_gitAvailable);
  const loadingCount = useAtomValue(atom_gitLoading);
  const loading = showGitChanges && loadingCount > 0;
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const isDiskVault = useAtomValue(atom_vaultDescriptor)?.kind === "local";
  // Checked once access is allowed: before that the folder can't be read.
  const isPending = useAtomValue(atom_isVaultPending);
  const hasGit = useVaultHasGit(isDiskVault && !isPending ? vaultHandle : null);
  const branch = useVaultGitBranch(hasGit ? vaultHandle : null);
  const { commands } = useCommandPalette();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const [menuBranch, setMenuBranch] = useState<string | null>(null);
  const label = showGitChanges && gitAvailable === false ? "No .git folder at the vault's root" : "Git";

  if (!hasGit) return null;

  const showChanges = pageCommand(CHANGES_SHORTCUT, commands);
  const items: TabContextMenuItem[] = [
    ...(menuBranch
      ? [{
          label: `Branch: ${menuBranch}`,
          icon: <TbGitBranch size={15} />,
          disabled: true,
          onClick: () => undefined,
        }]
      : []),
    ...(showChanges
      ? [{
          label: "Show Changes",
          icon: <TbListDetails size={15} />,
          shortcut: formatPageShortcut(CHANGES_SHORTCUT),
          divider: !!menuBranch,
          onClick: () => runPageCommand(showChanges),
        }]
      : []),
    // An icon on every row, so the labels share one column after the check's.
    {
      label: "Git Changes in File",
      icon: <TbFileDiff size={15} />,
      checked: showGitChanges,
      divider: true,
      onClick: () => setShowGitChanges(!showGitChanges),
    },
  ];

  const toggleMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (menuAt || !rect) {
      setMenuAt(null);
      return;
    }
    setMenuBranch(branch ?? null);
    setMenuAt({ x: rect.right, y: rect.bottom + 4 });
  };

  return (
    <>
      <Tooltip label={label} position="bottom" portal>
        <Button
          ref={buttonRef}
          variant="unstyled"
          onClick={toggleMenu}
          aria-label="Git"
          aria-haspopup="menu"
          aria-expanded={menuAt !== null}
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
      {menuAt && (
        <TabContextMenu x={menuAt.x} y={menuAt.y} align="end" items={items} label="Git" anchorRef={buttonRef} onClose={() => setMenuAt(null)} />
      )}
    </>
  );
}
