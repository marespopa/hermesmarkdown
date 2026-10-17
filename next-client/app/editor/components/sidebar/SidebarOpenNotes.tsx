"use client";

import React, { useState } from "react";
import { useAtomValue } from "jotai";
import { HiOutlineX } from "react-icons/hi";
import { atom_activePaneId, atom_openFiles, atom_saveStatus, atom_workspaceLayout, atom_workspaceTabs } from "@/app/atoms/atoms";
import { findLeaf, getFirstLeaf } from "@/app/atoms/utils";
import Button from "@/app/components/Button";
import { formatShortcut } from "@/app/utils/platform";
import { useNoteMenuItems } from "../../hooks/use-note-menu-items";
import { usePaneFileActions } from "../../hooks/use-pane-file-actions";
import TabContextMenu from "../TabContextMenu";
import { statusDot, type SaveState } from "../save-state";
import SidebarSection from "./SidebarSection";
import { sidebarItemClass } from "./sidebar-classes";

// The focused pane's open notes, for switching with one click: each by name,
// the one in front highlighted (on the editor), a small dot while one is
// unsaved, saving or failed to save, and a close button on hover or focus.
// On the editor, the first nine also show their Ctrl/Cmd+1–9 shortcut (its
// number counts every pane's notes, as the shortcut does), which gives way
// to the close button. A right-click (or the menu key) opens the note's
// menu, the same as on the pane's title (useNoteMenuItems).
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
  const workspaceTabs = useAtomValue(atom_workspaceTabs);
  const noteMenuItems = useNoteMenuItems(leaf);
  const [menu, setMenu] = useState<{ x: number; y: number; path: string } | null>(null);

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
        const tabIndex = workspaceTabs.findIndex((tab) => tab.paneId === leaf.id && tab.filePath === path);
        const shortcut = onEditor && tabIndex >= 0 && tabIndex < 9 ? formatShortcut(String(tabIndex + 1)) : null;
        return (
          <div key={path} className="group/open relative flex items-center">
            <Button
              variant="unstyled"
              onClick={() => onOpen(leaf.id, path)}
              onContextMenu={(event: React.MouseEvent) => {
                event.preventDefault();
                // From the keyboard (menu key, Shift+F10) there's no pointer: under the row.
                const rect = event.currentTarget.getBoundingClientRect();
                const fromKeyboard = event.clientX === 0 && event.clientY === 0;
                setMenu({ x: fromKeyboard ? rect.left + 8 : event.clientX, y: fromKeyboard ? rect.bottom : event.clientY, path });
              }}
              aria-current={isCurrent ? "page" : undefined}
              aria-label={dot ? `${name} — ${dotTitle}` : name}
              aria-keyshortcuts={shortcut ? `Control+${tabIndex + 1} Meta+${tabIndex + 1}` : undefined}
              title={path === "draft" ? name : path}
              className={`${sidebarItemClass(isCurrent)} w-full ${shortcut && !shortcut.startsWith("⌘") ? "pr-12" : "pr-8"}`}
            >
              <span className="min-w-0 flex-1 truncate">{name}</span>
              {dot && <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot.className}`} />}
            </Button>
            {shortcut && (
              <kbd aria-hidden="true" className="pointer-events-none absolute right-1.5 font-mono text-[10px] text-fg-faint transition-opacity group-focus-within/open:opacity-0 group-hover/open:opacity-0 [@media(hover:none)]:hidden">
                {shortcut}
              </kbd>
            )}
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
      {menu && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          label={`${(openFiles[menu.path]?.fileName || menu.path.split("/").pop() || "Note").replace(/\.md$/i, "")} actions`}
          items={noteMenuItems(menu.path)}
          onClose={() => setMenu(null)}
        />
      )}
    </SidebarSection>
  );
}
