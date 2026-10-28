"use client";

import React, { useRef } from "react";
import { useAtomValue } from "jotai";
import { atom_workspaceLayout } from "@/app/atoms/atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useVaultFileSearch } from "../../hooks/useVaultFileSearch";
import SidebarFiles from "../sidebar/SidebarFiles";
import { useSidebarNavigation } from "../sidebar/use-sidebar-navigation";
import type { VaultFileTreeController } from "../vault-tree/tree-model";

const NO_TAGS: string[] = [];

// The Files tab: the sidebar's Files section (search, tree, create menu),
// the same tree the desktop sidebar shows. Opening a note puts the drawer
// away at once, then reads the note behind it.
export default function FilesPane({ onOpened }: { onOpened: () => void }) {
  const hasVault = !!useAtomValue(atom_vaultHandle);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const navigation = useSidebarNavigation();
  const treeController = useRef<VaultFileTreeController | null>(null);
  const { allFiles, folderPaths } = useVaultFileSearch({ selectedTags: NO_TAGS, panel: "files", rememberedTree: true });
  const currentPath = navigation.onEditor ? workspaceLayout.rootContainer.activeFilePath ?? null : null;

  if (!hasVault) return <p className="px-4 py-3 text-ui-footnote text-fg-muted">Open a vault to see its files.</p>;
  return (
    <div className="px-2 pt-1">
      <SidebarFiles
        treeController={treeController}
        activeFilePath={currentPath}
        openHandle={(handle, path) => {
          onOpened();
          void navigation.openHandle(handle, path);
        }}
        allFiles={allFiles}
        folderPaths={folderPaths}
      />
    </div>
  );
}
