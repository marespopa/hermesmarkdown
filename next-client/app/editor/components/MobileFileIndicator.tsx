"use client";

import React from "react";
import { useAtomValue } from "jotai";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_openFiles,
  atom_saveStatus,
  findLeaf,
} from "@/app/atoms/atoms";
import { HiOutlineChevronDown, HiOutlineChatAlt2, HiOutlineSave } from "react-icons/hi";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { TabSaveState, statusMeta } from "./PaneTab";

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
  // Silent when clean (saved/idle) — spelling out "Saved" on every load
  // would just be noise; the icon alone still confirms it at a glance. The
  // label still reserves its full width even when hidden (via `invisible`,
  // not conditional rendering) so this segment never changes width across
  // states — otherwise the title next to it kept jumping left/right as the
  // status text appeared and disappeared.
  const showLabel = saveState === "dirty" || saveState === "saving" || saveState === "error";

  return (
    <div className="relative shrink-0 flex items-center h-11 bg-chrome border-b border-edge-subtle">
      {onOpenAIChat && (
        <button
          type="button"
          onClick={onOpenAIChat}
          aria-label="AI Chat"
          title="AI Chat"
          className="flex items-center justify-center h-11 min-w-11 shrink-0 text-fg-faint hover:text-sage transition-colors"
        >
          <HiOutlineChatAlt2 size={18} />
        </button>
      )}
      {hasOpenFiles && (
        <button
          type="button"
          onClick={onSave}
          disabled={saveState === "saving"}
          aria-label="Save file"
          title="Save now"
          className="flex items-center justify-center h-11 min-w-11 shrink-0 text-fg-faint hover:text-sage disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <HiOutlineSave size={18} />
        </button>
      )}
      {meta && (
        <span
          className="flex items-center gap-1 shrink-0 w-[88px]"
          title={saveState === "error" ? saveStatus.message || meta.title : meta.title}
        >
          <span className="flex items-center justify-center w-3 h-3 shrink-0">
            {saveState === "saving" ? (
              <span className="w-2.5 h-2.5 rounded-full border-2 border-edge border-t-sage animate-spin" />
            ) : (
              meta.Icon && <meta.Icon size={12} className={meta.className} />
            )}
          </span>
          <span className={`text-[10px] font-medium whitespace-nowrap ${showLabel ? meta.className : "invisible"}`}>
            {meta.label}
          </span>
        </span>
      )}
      <button
        type="button"
        onClick={() => openCommandPalette()}
        aria-label="Search files"
        className="flex-1 min-w-0 flex items-center justify-end gap-1.5 h-11 text-ui-footnote text-fg-muted px-3"
      >
        <span className="truncate">{label}</span>
        <HiOutlineChevronDown size={12} className="shrink-0" />
      </button>
    </div>
  );
}
