"use client";

import { HiOutlineClock, HiOutlineFolder, HiOutlineSearch } from "react-icons/hi";
import { formatShortcut } from "@/app/utils/platform";

interface VaultSidebarNavigatorProps {
  children: React.ReactNode;
  recentFiles: { path: string; name: string }[];
  onOpenRecent: (path: string) => void;
}

export default function VaultSidebarNavigator({ children, recentFiles, onOpenRecent }: VaultSidebarNavigatorProps) {
  const openCommandPalette = () =>
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {recentFiles.length > 0 && (
        <section className="shrink-0 border-b border-edge-subtle px-3 py-2" aria-labelledby="sidebar-recents">
          <p id="sidebar-recents" className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted/45">Recents</p>
          <div className="space-y-0.5">
            {recentFiles.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => onOpenRecent(file.path)}
                className="flex h-7 w-full items-center gap-2 rounded-lg px-2 text-left text-ui-footnote text-ink-muted transition-colors hover:bg-paper-light/70 hover:text-ink-light dark:text-stone dark:hover:bg-paper-dark-surface"
              >
                <HiOutlineClock size={13} className="shrink-0 opacity-60" />
                <span className="truncate">{file.name.replace(/\.md$/, "")}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="flex shrink-0 items-center gap-1 border-b border-edge-subtle px-3 py-2">
        <div className="flex flex-1 items-center text-ui-footnote text-ink-light dark:text-ink-dark">
          <HiOutlineFolder size={14} className="mr-1.5" />
          Files
        </div>
        <button
          type="button"
          onClick={openCommandPalette}
          title="Command palette (Ctrl/Cmd+K)"
          aria-label="Open command palette"
          className="flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[9px] leading-none text-ink-muted transition-colors hover:bg-paper-light/70 hover:text-ink-light dark:text-stone dark:hover:bg-paper-dark-surface"
        >
          <HiOutlineSearch size={13} />
          <span>{formatShortcut("K")} / {formatShortcut("P")}</span>
        </button>
      </div>
      <nav aria-label="Vault explorer" className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2">
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </nav>
    </div>
  );
}
