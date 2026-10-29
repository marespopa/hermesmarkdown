"use client";

import React from "react";
import { useAtomValue } from "jotai";
import { TbCopy, TbGitBranch } from "react-icons/tb";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import Button from "@/app/components/Button";
import { showCopyToast, showErrorToast } from "@/app/components/Toastr";
import { useVaultGitBranch } from "../../hooks/use-vault-git-branch";
import { SIDEBAR_ICON_CLASS } from "./sidebar-classes";

const ICON = { size: 15, "aria-hidden": true, className: SIDEBAR_ICON_CLASS } as const;

// The sidebar's foot: a VS Code-style status strip for the local Git branch
// when the vault is a repository.
export default function SidebarFooter() {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const isDiskVault = useAtomValue(atom_vaultDescriptor)?.kind === "local";
  const branch = useVaultGitBranch(isDiskVault ? vaultHandle : null);
  const copyBranch = () => {
    if (!branch || !navigator.clipboard) {
      showErrorToast("Couldn't copy branch name.");
      return;
    }
    navigator.clipboard.writeText(branch).then(
      () => showCopyToast("Branch name copied"),
      () => showErrorToast("Couldn't copy branch name."),
    );
  };

  return (
    isDiskVault && branch !== null ? (
      <div
        role="status"
        aria-label={branch ? `Git branch: ${branch}` : "Loading Git branch"}
        title={branch ? `Git branch: ${branch}` : undefined}
        className="flex h-11 shrink-0 items-center gap-2 border-t border-edge-subtle bg-fill px-3 text-ui-footnote text-fg-muted"
      >
        <TbGitBranch {...ICON} />
        {branch === undefined ? (
          <span aria-hidden="true" className="loading-bar-appear h-3 w-24 rounded-full bg-surface" />
        ) : (
          <>
            <span className="truncate">{branch}</span>
            <Button
              variant="unstyled"
              onClick={copyBranch}
              aria-label="Copy branch name"
              title="Copy branch name"
              className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded text-fg-faint hover:bg-surface hover:text-fg"
            >
              <TbCopy size={13} aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    ) : null
  );
}
