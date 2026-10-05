"use client";

import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_goHome,
  atom_openFiles,
  atom_saveStatus,
  findLeaf,
} from "@/app/atoms/atoms";
import { HiOutlineChevronDown, HiOutlineChatAlt2, HiOutlineHome } from "react-icons/hi";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { SaveStateIcon, TabSaveState, statusMeta } from "./PaneTab";
import Button from "@/app/components/Button";

interface MobileFileIndicatorProps {
  onSave: () => void;
  onOpenAIChat?: () => void;
}

// Tapping the title always opens the command palette — command-palette-first
// applies here too, so this isn't a file-switcher dropdown, just the
// always-present tap target for it (see EditorCommands.tsx /
// plans/hermes-design.md "Icon Rail"). Switching between already-open tabs
// happens by picking the file again in the palette.
export default function MobileFileIndicator({ onSave, onOpenAIChat }: MobileFileIndicatorProps) {
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const openFiles = useAtomValue(atom_openFiles);
  const saveStatus = useAtomValue(atom_saveStatus);
  const { open: openCommandPalette } = useCommandPalette();
  const goHome = useSetAtom(atom_goHome);

  const leaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
  const hasOpenFiles = !!leaf && leaf.openFilePaths.length > 0;
  const activePath = leaf?.activeFilePath;
  // Stays mounted (as "Search files…") even with nothing open — mobile has
  // no keyboard shortcut, and since MobileControlRail was retired this is
  // the only always-present entry point to the palette.
  const label = hasOpenFiles
    ? (activePath ? (openFiles[activePath]?.fileName || activePath.split("/").pop()) : "untitled")
    : "Search files…";

  // This bar stays fixed at the top while the editor content scrolls, so
  // it's the one place on mobile where save status is always visible —
  // the in-content frontmatter summary bar scrolls away with the rest.
  const fileState = activePath ? openFiles[activePath] : undefined;
  const isDirty = !!fileState && fileState.content !== fileState.lastSavedContent;
  const saveState: TabSaveState =
    saveStatus.path === activePath && saveStatus.state === "error"
      ? "error"
      : saveStatus.path === activePath && saveStatus.state === "saving"
      ? "saving"
      : saveStatus.path === activePath && saveStatus.state === "saved"
      ? "saved"
      : isDirty
      ? "dirty"
      : "idle";
  const meta = hasOpenFiles ? statusMeta[saveState] : null;

  return (
    <div className="relative shrink-0 flex items-center h-11 bg-chrome border-b border-edge-subtle">
      <Button variant="unstyled"
        onClick={() => goHome()}
        aria-label="Home feed"
        title="Home feed"
        className="flex items-center justify-center h-11 min-w-11 shrink-0 text-fg-faint hover:text-sage transition-colors"
      >
        <HiOutlineHome size={18} />
      </Button>
      {onOpenAIChat && (
        <Button variant="unstyled"
          onClick={onOpenAIChat}
          aria-label="AI Chat"
          title="AI Chat"
          className="flex items-center justify-center h-11 min-w-11 shrink-0 text-fg-faint hover:text-sage transition-colors"
        >
          <HiOutlineChatAlt2 size={18} />
        </Button>
      )}
      {hasOpenFiles && meta && (
        <Button variant="unstyled"
          onClick={onSave}
          disabled={saveState === "saving"}
          aria-label={`Save — ${meta.title}`}
          title={saveState === "error" ? saveStatus.message || meta.title : meta.title}
          className={`flex items-center justify-center h-11 min-w-11 shrink-0 disabled:pointer-events-none transition-colors ${
            saveState === "idle" ? "text-fg-faint hover:text-sage" : meta.className
          }`}
        >
          <SaveStateIcon state={saveState} size={18} />
        </Button>
      )}
      <Button variant="unstyled"
        onClick={() => openCommandPalette()}
        aria-label="Search files"
        className="flex-1 min-w-0 flex items-center justify-end gap-1.5 h-11 text-ui-footnote text-fg-muted px-3"
      >
        <span className="truncate">{label}</span>
        <HiOutlineChevronDown size={12} className="shrink-0" />
      </Button>
    </div>
  );
}
