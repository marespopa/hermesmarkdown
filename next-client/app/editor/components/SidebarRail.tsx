"use client";

import React from "react";
import { useAtom } from "jotai";
import {
  HiOutlineFolder,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineCollection,
  HiOutlineClipboardList,
  HiOutlineChatAlt2,
  HiOutlineBookOpen,
  HiOutlineCog,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineDesktopComputer,
  HiOutlineRefresh,
  HiOutlineLogout,
  HiOutlineDatabase,
  HiOutlineQuestionMarkCircle,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { atom_theme, RailPanel, type Theme } from "@/app/atoms/ui-atoms";

const SIDEBAR_PANELS: { id: RailPanel; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "files", label: "Files", Icon: HiOutlineFolder },
  { id: "search", label: "Search", Icon: HiOutlineSearch },
  { id: "tags", label: "Tags", Icon: HiOutlineTag },
  { id: "views", label: "Views", Icon: HiOutlineCollection },
  { id: "tasks", label: "Tasks", Icon: HiOutlineClipboardList },
];

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
  onSettings?: () => void;
  onRefreshVault?: () => void;
  onOpenAIChat?: () => void;
  onOpenDocumentation?: () => void;
  onOpenKeyboardShortcuts?: () => void;
}

export default function SidebarRail({ panel, onSelectPanel, onSettings, onRefreshVault, onOpenAIChat, onOpenDocumentation, onOpenKeyboardShortcuts }: SidebarRailProps) {
  const { vaultHandle, closeVault, openVault, isVaultSupported } = useFileSystem();
  const [rawTheme, setTheme] = useAtom(atom_theme);
  const themeCycleIndex = THEME_CYCLE.findIndex((t) => t.value === rawTheme);
  const { label: themeCycleLabel, Icon: ThemeCycleIcon } = THEME_CYCLE[themeCycleIndex];

  return (
    <nav className="w-14 h-full shrink-0 flex flex-col items-center justify-between py-3 bg-chrome border-r border-edge-subtle">
      <div className="flex flex-col items-center gap-1 w-full">
        {SIDEBAR_PANELS.map(({ id, label, Icon }) => (
          <div key={id} className="w-full flex justify-center">
            <Tooltip label={label} position="right">
              <button
                type="button"
                onClick={() => onSelectPanel(id)}
                aria-label={label}
                aria-pressed={panel === id}
                className={`w-11 h-10 flex items-center justify-center border-l-2 transition-colors ${
                  panel === id
                    ? "text-sage border-sage bg-sage/5"
                    : "text-ink-muted border-transparent hover:text-ink-light dark:text-stone dark:hover:text-ink-dark"
                }`}
              >
                <Icon size={18} />
              </button>
            </Tooltip>
          </div>
        ))}
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
      </div>

      <div className="flex flex-col items-center gap-1 w-full">
        {onOpenDocumentation && (
          <div className="w-full flex justify-center">
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

        {onSettings && (
          <div className="w-full flex justify-center">
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

        {vaultHandle && onRefreshVault && (
          <div className="w-full flex justify-center">
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

        <div className="w-full flex justify-center">
          <Tooltip label={themeCycleLabel} position="right">
            <Button
              variant="icon"
              onClick={() => setTheme(THEME_CYCLE[(themeCycleIndex + 1) % THEME_CYCLE.length].value)}
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

        {vaultHandle ? (
          <div className="w-full flex justify-center">
            <Tooltip label="Close Vault" position="right">
              <Button
                variant="icon"
                onClick={closeVault}
                className="w-10 h-10 text-red-500/80 hover:text-red-500 !rounded-none"
                aria-label="Close Vault"
              >
                <HiOutlineLogout size={20} />
              </Button>
            </Tooltip>
          </div>
        ) : (
          <div className="w-full flex justify-center">
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
