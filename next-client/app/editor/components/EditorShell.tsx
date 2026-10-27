"use client";

import React, { useEffect, type CSSProperties, type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { usePathname } from "next/navigation";
import { VscLayoutSidebarLeftOff } from "react-icons/vsc";
import { atom_isAiConfigured, atom_sidebarOpen, atom_sidebarWidth } from "@/app/atoms/ui-atoms";
import { atom_companionOpen, atom_companionWidth } from "@/app/atoms/companion-atoms";
import { atom_isVaultPending, atom_isVaultRestoring } from "@/app/atoms/vault-atoms";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { useVaultPins } from "@/app/hooks/use-vault-pins";
import { useVaultSync } from "@/app/hooks/use-vault-sync";
import { useVaultTreeSnapshot } from "@/app/hooks/use-vault-tree-snapshot";
import { useWebMcpTools } from "@/app/hooks/use-webmcp-tools";
import { PageShortcuts } from "@/app/components/CommandPalette/use-page-shortcuts";
import { formatShortcut } from "@/app/utils/platform";
import { useRecentVaultTracker } from "../hooks/use-recent-vaults";
import BrowserVaultDialog from "./BrowserVaultDialog";
import RecentVaultsDialog from "./RecentVaultsDialog";
import NewVaultDialog from "./NewVaultDialog";
import Button from "@/app/components/Button";
import { PANE_ICON_SIZE, PANE_SECTION_CLASS } from "./pane-header-classes";
import PaneToolbarButton from "./PaneToolbarButton";
import CopyContentButton from "./CopyContentButton";
import GitChangesToggleButton from "./GitChangesToggleButton";
import OutlineToggleButton from "./OutlineToggleButton";
import SearchPill from "./SearchPill";
import WorkspaceSidebar from "./WorkspaceSidebar";
import ActiveFileIndexer from "./ActiveFileIndexer";
import RecoveryBanner from "./RecoveryBanner";
import PinCommands from "./editor-commands/PinCommands";
import PerfReadout from "@/app/components/PerfReadout/PerfReadout";
import CompanionPanel from "./companion/CompanionPanel";
import ShellCommands from "./ShellCommands";

// Show / hide the sidebar: Ctrl/Cmd+\, Ctrl/Cmd+Alt+S (`code`, since Alt
// changes `key` on macOS), or Ctrl+[ — Ctrl on macOS too, where Cmd+[ is the
// browser's Back; skipped when the editor took it (Vim's Escape).
export function isSidebarToggleShortcut(event: KeyboardEvent): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey) return false;
  if (event.ctrlKey && !event.metaKey && !event.altKey && event.key === "[") return !event.defaultPrevented;
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
// of every page, the editor too (it has no toolbar). On the editor the
// SearchPill sits in the top-right corner, where the pages' title bars have
// theirs, with Copy Contents just left of it, so the page itself stays bare. Nothing
// hides on its own: the sidebar opens and closes only when you toggle it,
// remembered. RecoveryBanner floats above the content while notes can't be
// saved (lost vault access, a missing vault folder, full storage). Once the
// vault is unlocked it shows the vault's pins (kept on this device,
// useVaultPins) and offers Pin Page to Sidebar…
// (PinCommands) on every route. It keeps the vault's file list in step with
// the disk on every route too (useVaultSync), since the sidebar shows it.
export default function EditorShell({ children }: { children: ReactNode }) {
  const isMobileChrome = useIsMobileChrome();
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  const sidebarWidth = useAtomValue(atom_sidebarWidth);
  const isVaultRestoring = useAtomValue(atom_isVaultRestoring);
  const isVaultPending = useAtomValue(atom_isVaultPending);
  const isVaultLocked = isVaultRestoring || isVaultPending;
  // Settings is a page of its own: neither the sidebar nor the companion.
  const onSettings = usePathname() === "/editor/settings";
  const hasSidebar = !isMobileChrome && !isVaultLocked && !onSettings;
  useVaultPins(!isVaultLocked);
  useVaultSync();
  // The tree as last seen, until the vault's walk lists it again.
  useVaultTreeSnapshot();
  // On every route, so the Vault menu lists the recents from Settings too.
  useRecentVaultTracker();
  // Browser agents (WebMCP), when turned on in Settings.
  useWebMcpTools(!isVaultLocked);
  const onEditor = usePathname() === "/editor";
  // The AI companion, on the trailing edge, once AI is set up.
  const hasCompanion = useAtomValue(atom_isAiConfigured) && !isVaultLocked && !onSettings;
  const companionOpen = useAtomValue(atom_companionOpen);
  const companionWidth = useAtomValue(atom_companionWidth);

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

  const frame = {
    "--content-left": `${hasSidebar && sidebarOpen ? sidebarWidth : 0}px`,
    // The open companion's room; on mobile it is a sheet over the page.
    "--content-right": `${hasCompanion && !isMobileChrome && companionOpen ? companionWidth : 0}px`,
  } as CSSProperties;

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
      {hasSidebar && onEditor && (
        // The way into the command palette, the center of the app: every
        // note and command (as Ctrl/Cmd+K). Placed as in ShellPage's title
        // bar, so it stays put moving between the editor and the pages.
        // Copy Contents sits just left of it, the outline toggle left of that,
        // and the Git Changes toggle left of the outline toggle.
        <div
          style={{ right: "calc(var(--content-right, 0px) + 2rem)" }}
          className="fixed top-1.5 z-30 flex items-center gap-1.5 transition-[right] duration-layout ease-layout motion-reduce:transition-none"
        >
          <GitChangesToggleButton />
          <OutlineToggleButton />
          <CopyContentButton />
          <SearchPill />
        </div>
      )}
      {hasCompanion && (
        isMobileChrome ? <CompanionPanel sheet /> : (
          // Slides in and out of this zero-width wrapper; its room is --content-right.
          <div className="fixed inset-y-0 right-0 w-0 z-30">
            <CompanionPanel />
          </div>
        )
      )}
      {!isVaultLocked && <RecoveryBanner />}
      {!isVaultLocked && <PinCommands />}
      {!isVaultLocked && !onSettings && <ShellCommands hasCompanion={hasCompanion} />}
      {/* Tasks, Changes, Templates and Settings by key, from every route. */}
      {!isVaultLocked && <PageShortcuts />}
      <NewVaultDialog />
      <ActiveFileIndexer />
      <BrowserVaultDialog />
      <RecentVaultsDialog />
      {/* Dev builds only: timings for opens, typing and storage. */}
      <PerfReadout />
    </div>
  );
}
