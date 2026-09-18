"use client";

import { HiChevronDown, HiOutlineCloud, HiOutlineFolder } from "react-icons/hi";

interface VaultSidebarHeaderProps {
  vaultName?: string;
  isCloudVault: boolean;
  hasVault: boolean;
  onSwitchVault?: () => void;
}

export default function VaultSidebarHeader({
  vaultName,
  isCloudVault,
  hasVault,
  onSwitchVault,
}: VaultSidebarHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-edge-subtle bg-chrome/70 px-3 py-3 backdrop-blur-2xl">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="min-w-0">
          <button
            type="button"
            onClick={onSwitchVault}
            disabled={!onSwitchVault}
            aria-label="Switch vault"
            className="flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-1 text-ui-subhead font-medium text-ink-light opacity-80 transition-colors hover:bg-paper-light/70 hover:opacity-100 disabled:cursor-default disabled:hover:bg-transparent dark:text-ink-dark dark:hover:bg-paper-dark-surface"
          >
          <HiOutlineFolder size={15} className="shrink-0 text-ink-muted dark:text-stone" />
          <span className="truncate">{vaultName || "Notes"}</span>
          <HiChevronDown size={14} className="shrink-0 text-ink-muted dark:text-stone" />
          {isCloudVault && hasVault && (
            <span
              title="Cloud sync detected. HermesMarkdown will use enhanced error recovery if files are locked."
              className="shrink-0 text-sage/60 cursor-help"
            >
              <HiOutlineCloud size={14} />
            </span>
          )}
          </button>
        </h2>
      </div>
    </header>
  );
}
