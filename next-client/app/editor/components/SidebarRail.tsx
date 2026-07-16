"use client";

import React from "react";
import { useAtom } from "jotai";
import {
  HiOutlineFolder,
  HiOutlineSearch,
  HiOutlineTag,
  HiOutlineCollection,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineRefresh,
  HiOutlineLogout,
  HiOutlineDatabase,
} from "react-icons/hi";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { atom_theme, RailPanel } from "@/app/atoms/ui-atoms";

const SIDEBAR_PANELS: { id: RailPanel; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "files", label: "Files", Icon: HiOutlineFolder },
  { id: "search", label: "Search", Icon: HiOutlineSearch },
  { id: "tags", label: "Tags", Icon: HiOutlineTag },
  { id: "views", label: "Views", Icon: HiOutlineCollection },
  { id: "tasks", label: "Tasks", Icon: HiOutlineClipboardList },
];

interface SidebarRailProps {
  panel: RailPanel | null;
  onSelectPanel: (id: RailPanel) => void;
  onSettings?: () => void;
  onRefreshVault?: () => void;
}

// Anchored to the right of the rail (rather than above, like the old
// horizontal footer's tooltip) since this is a vertical column of icons.
function RailTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap bg-overlay border border-edge text-fg text-ui-caption px-2 py-1 opacity-0 group-hover/rail-item:opacity-100 transition-opacity [transition-delay:400ms] z-50">
      {label}
    </span>
  );
}

export default function SidebarRail({ panel, onSelectPanel, onSettings, onRefreshVault }: SidebarRailProps) {
  const { vaultHandle, closeVault, openVault, isVaultSupported } = useFileSystem();
  const [theme, setTheme] = useAtom(atom_theme);

  return (
    <nav className="w-14 h-full shrink-0 flex flex-col items-center justify-between py-3 bg-chrome border-r border-edge-subtle">
      <div className="flex flex-col items-center gap-1 w-full">
        {SIDEBAR_PANELS.map(({ id, label, Icon }) => (
          <div key={id} className="relative group/rail-item w-full flex justify-center">
            <button
              type="button"
              onClick={() => onSelectPanel(id)}
              title={label}
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
            <RailTooltip label={label} />
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1 w-full">
        {onSettings && (
          <div className="relative group/rail-item w-full flex justify-center">
            <Button
              variant="icon"
              onClick={onSettings}
              className="w-10 h-10 opacity-80 hover:opacity-100 !rounded-none"
              aria-label="Settings"
            >
              <HiOutlineCog size={18} />
            </Button>
            <RailTooltip label="Settings" />
          </div>
        )}

        {vaultHandle && onRefreshVault && (
          <div className="relative group/rail-item w-full flex justify-center">
            <Button
              variant="icon"
              onClick={onRefreshVault}
              className="w-10 h-10 opacity-80 hover:opacity-100 !rounded-none"
              aria-label="Refresh vault"
            >
              <HiOutlineRefresh size={18} />
            </Button>
            <RailTooltip label="Refresh vault" />
          </div>
        )}

        <div className="relative group/rail-item w-full flex justify-center">
          <Button
            variant="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-10 h-10 opacity-80 hover:opacity-100 !rounded-none"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <HiOutlineSun size={18} /> : <HiOutlineMoon size={18} />}
          </Button>
          <RailTooltip label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} />
        </div>

        {vaultHandle ? (
          <div className="relative group/rail-item w-full flex justify-center">
            <Button
              variant="icon"
              onClick={closeVault}
              className="w-10 h-10 text-red-500/80 hover:text-red-500 !rounded-none"
              aria-label="Close Vault"
            >
              <HiOutlineLogout size={20} />
            </Button>
            <RailTooltip label="Close Vault" />
          </div>
        ) : (
          <div className="relative group/rail-item w-full flex justify-center">
            <Button
              variant="icon"
              onClick={openVault}
              disabled={!isVaultSupported}
              className="w-10 h-10 text-sage/80 hover:text-sage !rounded-none"
              aria-label={isVaultSupported ? "Open Vault" : "Vault not supported"}
            >
              <HiOutlineDatabase size={20} />
            </Button>
            <RailTooltip label={isVaultSupported ? "Open Vault" : "Vault not supported"} />
          </div>
        )}
      </div>
    </nav>
  );
}
