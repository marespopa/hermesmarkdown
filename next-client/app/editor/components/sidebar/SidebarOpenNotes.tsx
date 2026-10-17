"use client";

import React from "react";
import { useAtomValue } from "jotai";
import { HiOutlineX } from "react-icons/hi";
import { atom_activePaneId, atom_openFiles, atom_saveStatus, atom_workspaceLayout } from "@/app/atoms/atoms";
import { findLeaf, getFirstLeaf } from "@/app/atoms/utils";
import Button from "@/app/components/Button";
import { usePaneFileActions } from "../../hooks/use-pane-file-actions";
import { statusDot, type SaveState } from "../save-state";
import SidebarSection from "./SidebarSection";
import { sidebarItemClass } from "./sidebar-classes";

// The focused pane's open notes, for switching with one click: each by name,
// the one in front highlighted (on the editor), a small dot while one is
// unsaved, saving or failed to save, and a close button on hover or focus.
// `onOpen` brings a note to the front of its pane (and back to the editor
// from another page). Renders nothing while no note is open.
export default function SidebarOpenNotes({
  onEditor,
  onOpen,
}: {
  onEditor: boolean;
  onOpen: (paneId: string, path: string) => void;
}) {
  const layout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const openFiles = useAtomValue(atom_openFiles);
  const saveStatus = useAtomValue(atom_saveStatus);
  const leaf = (activePaneId ? findLeaf(layout.rootContainer, activePaneId) : null) ?? getFirstLeaf(layout.rootContainer);
  const { closeTabWithAutosave } = usePaneFileActions(leaf);

  if (!leaf || leaf.openFilePaths.length === 0) return null;

  const saveStateOf = (path: string): SaveState => {
    if (saveStatus.path === path && (saveStatus.state === "error" || saveStatus.state === "saving")) return saveStatus.state;
    const file = openFiles[path];
    return file && file.content !== file.lastSavedContent ? "dirty" : "idle";
  };

  return (
    <SidebarSection title="Open Notes">
      {leaf.openFilePaths.map((path) => {
        const name = (openFiles[path]?.fileName || path.split("/").pop() || "Untitled").replace(/\.md$/i, "");
        const isCurrent = onEditor && leaf.activeFilePath === path;
        const state = saveStateOf(path);
        const dot = state === "idle" ? null : statusDot[state];
        const dotTitle = state === "error" ? saveStatus.message || statusDot.error.title : dot?.title;
        return (
          <div key={path} className="group/open relative flex items-center">
            <Button
              variant="unstyled"
              onClick={() => onOpen(leaf.id, path)}
              aria-current={isCurrent ? "page" : undefined}
              aria-label={dot ? `${name} — ${dotTitle}` : name}
              title={path === "draft" ? name : path}
              className={`${sidebarItemClass(isCurrent)} w-full pr-8`}
            >
              <span className="min-w-0 flex-1 truncate">{name}</span>
              {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot.className}`} />}
            </Button>
            <Button
              variant="unstyled"
              onClick={() => void closeTabWithAutosave(path)}
              aria-label={`Close ${name}`}
              title={`Close ${name}`}
              className="absolute right-1 inline-flex h-5 w-5 items-center justify-center rounded text-fg-faint opacity-0 transition-[color,background-color,opacity] hover:bg-black/[0.06] hover:text-fg focus-visible:opacity-100 group-hover/open:opacity-100 dark:hover:bg-white/[0.09] [@media(hover:none)]:opacity-100"
            >
              <HiOutlineX size={12} aria-hidden="true" />
            </Button>
          </div>
        );
      })}
    </SidebarSection>
  );
}
