"use client";

import React from "react";
import { useAtom } from "jotai";
import {
  HiOutlineChatAlt2,
  HiOutlineBookOpen,
  HiOutlineCog,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineDesktopComputer,
  HiOutlineRefresh,
  HiOutlineDatabase,
  HiOutlineQuestionMarkCircle,
  HiOutlineViewGrid,
  HiOutlineFolder,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { useCommandPalette } from "@/app/components/CommandPalette/CommandPaletteContext";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { formatShortcut } from "@/app/utils/platform";
import { getNextTheme } from "@/app/utils/theme";
import { atom_theme, RailPanel, type Theme } from "@/app/atoms/ui-atoms";

// Click cycles system -> light -> dark -> system. Each entry's Icon/label
// describes that state itself (not the state the click leads to).
const THEME_CYCLE: { value: Theme; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { value: "system", label: "Theme: System", Icon: HiOutlineDesktopComputer },
  { value: "light", label: "Theme: Light", Icon: HiOutlineSun },
  { value: "dark", label: "Theme: Dark", Icon: HiOutlineMoon },
];

interface SidebarRailProps {
  panel: RailPanel | null;
  onSelectPanel: (id: RailPanel) => void;
  reopenPanel?: RailPanel;
  onSettings?: () => void;
  onRefreshVault?: () => void;
  onOpenAIChat?: () => void;
  onOpenDocumentation?: () => void;
  onOpenKeyboardShortcuts?: () => void;
}

export default function SidebarRail({ panel, onSelectPanel, reopenPanel = "files", onSettings, onRefreshVault, onOpenAIChat, onOpenDocumentation, onOpenKeyboardShortcuts }: SidebarRailProps) {
  void panel;
  void onSelectPanel;
  const { vaultHandle, openVault, isVaultSupported } = useFileSystem();
  const { open: openCommandPalette } = useCommandPalette();
  const [rawTheme, setTheme] = useAtom(atom_theme);
  const themeCycleIndex = THEME_CYCLE.findIndex((t) => t.value === rawTheme);
  const { label: themeCycleLabel, Icon: ThemeCycleIcon } = THEME_CYCLE[themeCycleIndex];

  return (
    <nav className="w-14 h-full shrink-0 flex flex-col items-center justify-between py-3 bg-chrome border-r border-edge-subtle">
      <div className="flex flex-col items-center gap-1 w-full">
        <div className="w-full flex justify-center">
          <Tooltip label="Show sidebar" position="right">
            <button
              type="button"
              onClick={() => onSelectPanel(reopenPanel)}
              aria-label="Show sidebar"
              className="w-11 h-10 flex items-center justify-center text-sage hover:text-sage/80 transition-colors"
            >
              <HiOutlineFolder size={18} />
            </button>
          </Tooltip>
        </div>
        <div className="w-full flex justify-center mt-2 pt-2 border-t border-edge-subtle">
          <Tooltip label="Command palette" shortcut={formatShortcut("K")} position="right">
            <Button
              variant="icon"
              onClick={() => openCommandPalette()}
              className="w-10 h-10 opacity-80 hover:opacity-100 !rounded-none"
              aria-label="Command palette"
              data-command-palette-trigger
            >
              <HiOutlineViewGrid size={18} />
            </Button>
          </Tooltip>
        </div>

        {onOpenAIChat && (
          <div className="w-full flex justify-center">
            <Tooltip label="AI Chat" position="right">
              <button
                type="button"
                onClick={onOpenAIChat}
                aria-label="AI Chat"
                className="w-11 h-10 flex items-center justify-center border-l-2 border-transparent text-ink-muted transition-colors hover:text-ink-light dark:text-stone dark:hover:text-ink-dark"
              >
                <HiOutlineChatAlt2 size={18} />
              </button>
            </Tooltip>
          </div>
        )}

        {onOpenDocumentation && (
          <div className="w-full flex justify-center mt-2 pt-2 border-t border-edge-subtle">
            <Tooltip label="Documentation" position="right">
              <Button
                variant="icon"
                onClick={onOpenDocumentation}
                className="w-10 h-10 opacity-80 hover:opacity-100 !rounded-none"
                aria-label="Documentation"
              >
                <HiOutlineBookOpen size={18} />
              </Button>
            </Tooltip>
          </div>
        )}

        {onOpenKeyboardShortcuts && (
          <div className="w-full flex justify-center">
            <Tooltip label="Keyboard shortcuts" position="right">
              <Button
                variant="icon"
                onClick={onOpenKeyboardShortcuts}
                className="w-10 h-10 opacity-80 hover:opacity-100 !rounded-none"
                aria-label="Keyboard shortcuts"
              >
                <HiOutlineQuestionMarkCircle size={18} />
              </Button>
            </Tooltip>
          </div>
        )}

        {vaultHandle && onRefreshVault && (
          <div className="w-full flex justify-center mt-2 pt-2 border-t border-edge-subtle">
            <Tooltip label="Refresh vault" position="right">
              <Button
                variant="icon"
                onClick={onRefreshVault}
                className="w-10 h-10 opacity-80 hover:opacity-100 !rounded-none"
                aria-label="Refresh vault"
              >
                <HiOutlineRefresh size={18} />
              </Button>
            </Tooltip>
          </div>
        )}

        {onSettings && (
          <div className="w-full flex justify-center mt-2 pt-2 border-t border-edge-subtle">
            <Tooltip label="Settings" position="right">
              <Button
                variant="icon"
                onClick={onSettings}
                className="w-10 h-10 opacity-80 hover:opacity-100 !rounded-none"
                aria-label="Settings"
              >
                <HiOutlineCog size={18} />
              </Button>
            </Tooltip>
          </div>
        )}

        <div className="w-full flex justify-center">
          <Tooltip label={themeCycleLabel} position="right">
            <Button
              variant="icon"
              onClick={() => setTheme(getNextTheme(rawTheme))}
              className="w-10 h-10 opacity-80 hover:opacity-100 !rounded-none"
              aria-label={themeCycleLabel}
              // "system" resolves from the OS preference, which SSR has no
              // access to — the icon/label here can only be known correct
              // after mount (see use-resolved-theme.ts), so the first-paint
              // mismatch this suppresses is expected, not a bug.
              suppressHydrationWarning
            >
              <ThemeCycleIcon size={18} />
            </Button>
          </Tooltip>
        </div>

        {!vaultHandle && (
          <div className="w-full flex justify-center mt-2 pt-2 border-t border-edge-subtle">
            <Tooltip label={isVaultSupported ? "Open Vault" : "Vault not supported"} position="right">
              <Button
                variant="icon"
                onClick={openVault}
                disabled={!isVaultSupported}
                className="w-10 h-10 text-sage/80 hover:text-sage !rounded-none"
                aria-label={isVaultSupported ? "Open Vault" : "Vault not supported"}
              >
                <HiOutlineDatabase size={20} />
              </Button>
            </Tooltip>
          </div>
        )}

      </div>
    </nav>
  );
}
