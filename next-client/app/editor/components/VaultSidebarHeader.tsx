"use client";

import { HiChevronLeft, HiOutlineCheckCircle, HiOutlineCloud, HiOutlineCog, HiOutlineFolder, HiOutlineBookOpen, HiOutlineSun, HiOutlineMoon, HiOutlineDesktopComputer } from "react-icons/hi";
import { useAtom } from "jotai";
import { atom_theme, type Theme } from "@/app/atoms/ui-atoms";
import Tooltip from "@/app/components/Tooltip";

const THEME_CYCLE: { value: Theme; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { value: "system", label: "Theme: System", Icon: HiOutlineDesktopComputer },
  { value: "light", label: "Theme: Light", Icon: HiOutlineSun },
  { value: "dark", label: "Theme: Dark", Icon: HiOutlineMoon },
];

interface VaultSidebarHeaderProps {
  vaultName?: string;
  userName?: string;
  isCloudVault: boolean;
  hasVault: boolean;
  onSettings?: () => void;
  onTasks?: () => void;
  onDocumentation?: () => void;
  onCollapse: () => void;
}

export default function VaultSidebarHeader({
  vaultName,
  userName,
  isCloudVault,
  hasVault,
  onSettings,
  onTasks,
  onDocumentation,
  onCollapse,
}: VaultSidebarHeaderProps) {
  const [rawTheme, setTheme] = useAtom(atom_theme);
  const themeCycleIndex = Math.max(0, THEME_CYCLE.findIndex((entry) => entry.value === rawTheme));
  const themeCycle = THEME_CYCLE[themeCycleIndex];

  return (
    <header className="p-3 flex flex-col gap-2 shrink-0">
      {userName && (
        <p className="text-ui-footnote text-ink-muted dark:text-stone truncate">{`Welcome back, ${userName}`}</p>
      )}
      <div className="flex justify-between items-center gap-2 h-8">
        <h2 className="text-ui-subhead font-medium text-ink-light dark:text-ink-dark opacity-80 flex items-center gap-1.5 min-w-0">
          <HiOutlineFolder size={15} className="shrink-0 text-ink-muted dark:text-stone" />
          <span className="truncate">{vaultName || "Notes"}</span>
          {isCloudVault && hasVault && (
            <span
              title="Cloud sync detected. HermesMarkdown will use enhanced error recovery if files are locked."
              className="shrink-0 text-sage/60 cursor-help"
            >
              <HiOutlineCloud size={14} />
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onCollapse} title="Collapse sidebar" aria-label="Collapse sidebar" className="flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark">
            <HiChevronLeft size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 items-center border-t border-edge-subtle pt-2">
        <div className="flex justify-center">
          {onTasks && (
            <Tooltip label="Tasks">
              <button type="button" onClick={onTasks} aria-label="Tasks" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-paper-softgray hover:text-ink-light focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/40 dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark">
                <HiOutlineCheckCircle size={17} />
              </button>
            </Tooltip>
          )}
        </div>
        <div className="flex justify-center">
          {onSettings && (
            <Tooltip label="Settings">
              <button type="button" onClick={onSettings} aria-label="Settings" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-paper-softgray hover:text-ink-light focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/40 dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark">
                <HiOutlineCog size={17} />
              </button>
            </Tooltip>
          )}
        </div>
        <div className="flex justify-center">
          {onDocumentation && (
            <Tooltip label="Documentation">
              <button type="button" onClick={onDocumentation} aria-label="Documentation" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-paper-softgray hover:text-ink-light focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/40 dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark">
                <HiOutlineBookOpen size={17} />
              </button>
            </Tooltip>
          )}
        </div>
        <div className="flex justify-center">
          <Tooltip label={themeCycle.label}>
            <button type="button" onClick={() => setTheme(THEME_CYCLE[(themeCycleIndex + 1) % THEME_CYCLE.length].value)} aria-label={themeCycle.label} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-paper-softgray hover:text-ink-light focus:outline-none focus-visible:ring-2 focus-visible:ring-sage/40 dark:text-stone dark:hover:bg-paper-dark-surface dark:hover:text-ink-dark">
              <themeCycle.Icon size={17} />
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
