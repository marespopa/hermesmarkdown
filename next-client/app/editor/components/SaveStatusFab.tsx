"use client";

import React from "react";
import { useAtomValue } from "jotai";
import {
  atom_workspaceLayout,
  atom_activePaneId,
  atom_openFiles,
  atom_saveStatus,
  atom_sidebarWidth,
  atom_railPanel,
  findLeaf,
} from "@/app/atoms/atoms";
import { BsFloppyFill } from "react-icons/bs";
import { TabSaveState, statusMeta } from "./PaneTab";

interface SaveStatusFabProps {
  onSave: () => void;
}

// Fixed bottom-left save-status indicator for desktop — the in-content
// frontmatter summary bar scrolls away with the editor, so this is the one
// place save state stays visible regardless of scroll position. Spells the
// state out (icon + label) rather than a bare dot, which wasn't legible on
// its own. Lives in the opposite corner from FabBar (bottom-right,
// draggable) so the two never compete for the same spot. Shifts right by
// the sidebar's width while it's open, so the sidebar panel never covers it.
// A dedicated save button is attached alongside the readout — same action
// as Cmd+S, for people who'd rather click.
const EDGE_PAD = 16;
const PILL_HEIGHT = 30;

export default function SaveStatusFab({ onSave }: SaveStatusFabProps) {
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const openFiles = useAtomValue(atom_openFiles);
  const saveStatus = useAtomValue(atom_saveStatus);
  const railPanel = useAtomValue(atom_railPanel);
  const sidebarWidth = useAtomValue(atom_sidebarWidth);

  const leaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
  const filePath = leaf?.activeFilePath;
  if (!filePath) return null;

  const fileState = openFiles[filePath];
  const isDirty = !!fileState && fileState.content !== fileState.lastSavedContent;
  const saveState: TabSaveState =
    saveStatus.path === filePath && saveStatus.state === "error"
      ? "error"
      : saveStatus.path === filePath && saveStatus.state === "saving"
      ? "saving"
      : saveStatus.path === filePath && saveStatus.state === "saved"
      ? "saved"
      : isDirty
      ? "dirty"
      : "idle";
  const meta = statusMeta[saveState];
  const sidebarOffset = railPanel !== null ? sidebarWidth : 0;

  return (
    <div
      className="fixed z-[80] flex items-center rounded-full shadow-lg bg-chrome border border-edge-subtle select-none overflow-hidden transition-[left] duration-300 ease-in-out"
      style={{
        left: EDGE_PAD + sidebarOffset,
        bottom: EDGE_PAD,
        height: PILL_HEIGHT,
      }}
    >
      <span
        className="flex items-center gap-1.5 h-full pl-2.5 pr-2"
        title={saveState === "error" ? saveStatus.message || meta.title : meta.title}
      >
        {saveState === "saving" ? (
          <span className="w-3 h-3 rounded-full border-2 border-edge border-t-sage animate-spin shrink-0" />
        ) : (
          meta.Icon && <meta.Icon size={13} className={`shrink-0 ${meta.className}`} />
        )}
        <span className={`text-[11px] font-medium leading-none whitespace-nowrap ${meta.className}`}>
          {meta.label}
        </span>
      </span>
      <button
        type="button"
        onClick={onSave}
        disabled={saveState === "saving"}
        aria-label="Save now"
        title="Save now"
        className="flex items-center justify-center h-full pl-2 pr-2.5 border-l border-edge-subtle text-fg-faint hover:text-sage hover:bg-sage/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <BsFloppyFill size={13} />
      </button>
    </div>
  );
}
