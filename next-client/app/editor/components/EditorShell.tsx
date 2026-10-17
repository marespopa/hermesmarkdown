"use client";

import React, { useEffect, type CSSProperties, type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { VscLayoutSidebarLeftOff } from "react-icons/vsc";
import { atom_sidebarOpen, atom_sidebarWidth } from "@/app/atoms/ui-atoms";
import { atom_isVaultPending, atom_isVaultRestoring } from "@/app/atoms/vault-atoms";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { formatShortcut } from "@/app/utils/platform";
import BrowserVaultDialog from "./BrowserVaultDialog";
import GitHubVaultDialog from "./GitHubVaultDialog";
import NewVaultDialog from "./NewVaultDialog";
import { PANE_ICON_SIZE, PANE_SECTION_CLASS } from "./pane-header-classes";
import PaneToolbarButton from "./PaneToolbarButton";
import WorkspaceSidebar from "./WorkspaceSidebar";

// Show / hide the sidebar: Ctrl/Cmd+\, or Ctrl/Cmd+Alt+S (`code`, since Alt
// changes `key` on macOS).
export function isSidebarToggleShortcut(event: KeyboardEvent): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey) return false;
  return (!event.altKey && event.key === "\\") || (event.altKey && event.code === "KeyS");
}


// One frame for every /editor route (editor layout, inside VaultAccessGate):
// the same sidebar on the editor and every page (Tasks,
// Templates, Trash, Files, Settings), so moving between them never changes
// the navigation, and the vault dialogs its switcher opens. Desktop only:
// mobile has no sidebar. Flat, as a plain writing app: the sidebar is a
// panel on the window's edge and the content (the editor page, or a
// ShellPage) fills the rest, starting at `--content-left` (the open
// sidebar's width, else 0), so it is pushed over, never covered. While
// the sidebar is hidden, a Show sidebar button sits in the top-left corner
// of every page, the editor too (it has no toolbar). Nothing hides on its
// own: the sidebar opens and closes only when you toggle it, remembered.
export default function EditorShell({ children }: { children: ReactNode }) {
  const isMobileChrome = useIsMobileChrome();
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  const sidebarWidth = useAtomValue(atom_sidebarWidth);
  const isVaultRestoring = useAtomValue(atom_isVaultRestoring);
  const isVaultPending = useAtomValue(atom_isVaultPending);
  const isVaultLocked = isVaultRestoring || isVaultPending;
  const hasSidebar = !isMobileChrome && !isVaultLocked;

  useEffect(() => {
    if (!hasSidebar) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSidebarToggleShortcut(event)) return;
      event.preventDefault();
      setSidebarOpen((open) => !open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasSidebar, setSidebarOpen]);

  const frame = { "--content-left": `${hasSidebar && sidebarOpen ? sidebarWidth : 0}px` } as CSSProperties;

  return (
    <div className="contents" style={frame}>
      {children}
      {hasSidebar && (
        // The sidebar slides in and out of this zero-width wrapper; the room
        // it takes is --content-left, above.
        <div className="fixed inset-y-0 left-0 w-0 z-30">
          <WorkspaceSidebar />
        </div>
      )}
      {hasSidebar && !sidebarOpen && (
        <div
          className={`${PANE_SECTION_CLASS} fixed top-1.5 left-2 !ml-0 z-30`}
        >
          <PaneToolbarButton
            icon={<VscLayoutSidebarLeftOff size={PANE_ICON_SIZE} />}
            label="Sidebar"
            tooltip="Show sidebar"
            shortcut={formatShortcut("\\")}
            tooltipPosition="bottom-start"
            onClick={() => setSidebarOpen(true)}
          />
        </div>
      )}
      <NewVaultDialog />
      <GitHubVaultDialog />
      <BrowserVaultDialog />
    </div>
  );
}
