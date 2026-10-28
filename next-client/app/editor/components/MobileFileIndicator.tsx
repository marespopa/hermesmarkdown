"use client";

import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  atom_workspaceLayout,
  atom_openNoteDirty,
  atom_openNoteFileName,
  atom_saveStatus,
} from "@/app/atoms/atoms";
import { HiOutlineChevronDown, HiOutlineChatAlt2, HiOutlineMenuAlt2, HiOutlineViewList } from "react-icons/hi";
import { atom_mobileDrawerOpen, atom_mobileOutlineOpen } from "@/app/atoms/mobile-drawer-atoms";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { SaveStateIcon, type SaveState, statusMeta } from "./save-state";
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
export default function MobileFileIndicator({
  onSave,
  onOpenAIChat,
}: MobileFileIndicatorProps) {
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const saveStatus = useAtomValue(atom_saveStatus);
  const { open: openCommandPalette } = useCommandPalette();
  const setDrawerOpen = useSetAtom(atom_mobileDrawerOpen);
  const setOutlineOpen = useSetAtom(atom_mobileOutlineOpen);

  const leaf = workspaceLayout.rootContainer;
  const hasOpenFiles = !!leaf && leaf.openFilePaths.length > 0;
  const activePath = leaf?.activeFilePath;
  // The name and the unsaved mark only, not the text: no render per keystroke.
  const activeFileName = useAtomValue(
    atom_openNoteFileName(activePath ?? "draft"),
  );
  const isDirty =
    useAtomValue(atom_openNoteDirty(activePath ?? "draft")) && !!activePath;
  // Stays mounted (as "Search files…") even with nothing open — mobile has
  // no keyboard shortcut, and since MobileControlRail was retired this is
  // the only always-present entry point to the palette.
  const label = hasOpenFiles
    ? activePath
      ? activeFileName || activePath.split("/").pop()
      : "untitled"
    : "Search files…";

  // This bar stays fixed at the top while the editor content scrolls, so
  // it's the one place on mobile where save status is always visible —
  // the in-content frontmatter summary bar scrolls away with the rest.
  const saveState: SaveState =
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
    <div className="glass-bar relative shrink-0 flex items-center h-11 overflow-hidden border-b border-edge-subtle">
      <Button
        variant="unstyled"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open navigation"
        title="Files and tags"
        className="flex items-center justify-center h-11 min-w-11 shrink-0 text-fg-faint hover:text-fg transition-colors"
      >
        <HiOutlineMenuAlt2 size={18} />
      </Button>
      {onOpenAIChat && (
        <Button
          variant="unstyled"
          onClick={onOpenAIChat}
          aria-label="Ask AI"
          title="Ask AI"
          className="flex items-center justify-center h-11 min-w-11 shrink-0 text-fg-faint hover:text-fg transition-colors"
        >
          <HiOutlineChatAlt2 size={18} />
        </Button>
      )}
      {hasOpenFiles && meta && (
        <Button
          variant="unstyled"
          onClick={onSave}
          disabled={saveState === "saving"}
          aria-label={`Save — ${meta.title}`}
          title={
            saveState === "error"
              ? saveStatus.message || meta.title
              : meta.title
          }
          className={`flex items-center justify-center h-11 min-w-11 shrink-0 disabled:pointer-events-none transition-colors ${
            saveState === "idle"
              ? "text-fg-faint hover:text-fg"
              : meta.className
          }`}
        >
          <SaveStateIcon state={saveState} size={18} />
        </Button>
      )}
      <Button
        variant="unstyled"
        onClick={() => openCommandPalette()}
        aria-label="Search files"
        className="flex-1 min-w-0 flex items-center justify-end gap-1.5 h-11 text-ui-footnote text-fg-muted px-3"
      >
        <span className="truncate">{label}</span>
        <HiOutlineChevronDown size={12} className="shrink-0" />
      </Button>
      {hasOpenFiles && (
        <Button
          variant="unstyled"
          onClick={() => setOutlineOpen(true)}
          aria-label="Open outline"
          title="Outline and metrics"
          className="flex items-center justify-center h-11 min-w-11 shrink-0 text-fg-faint hover:text-fg transition-colors"
        >
          <HiOutlineViewList size={18} />
        </Button>
      )}
    </div>
  );
}
