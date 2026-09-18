"use client";

import React, { useEffect, useState } from "react";
import { HiOutlineDocumentAdd, HiOutlineFolderAdd } from "react-icons/hi";
import type { RailPanel } from "@/app/atoms/ui-atoms";

interface VaultSidebarNavigatorProps {
  panel: RailPanel;
  onSelectPanel: (panel: RailPanel) => void;
  search: React.ReactNode;
  children: React.ReactNode;
  onNewFile?: () => void;
  onNewFolder?: () => void;
}

const sections: { id: RailPanel; label: string }[] = [
  { id: "files", label: "Files" },
  { id: "views", label: "Views" },
  { id: "tags", label: "Tags" },
];

export default function VaultSidebarNavigator({ panel, onSelectPanel, search, children, onNewFile, onNewFolder }: VaultSidebarNavigatorProps) {
  const activePanel = panel === "search" ? "files" : panel;
  const [expandedPanel, setExpandedPanel] = useState<RailPanel | null>(activePanel);

  useEffect(() => {
    setExpandedPanel(activePanel);
  }, [activePanel]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 pb-2 shrink-0 flex items-center gap-2">
        <div className="flex-1">{search}</div>
        <button
          type="button"
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
          title="Command palette (Ctrl+K)"
          aria-label="Command palette"
          className="shrink-0 px-2 py-1.5 text-ui-footnote text-ink-muted dark:text-stone hover:text-ink-light dark:hover:text-ink-dark"
        >
          ⌘K
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <nav aria-label="Notes sections" className="px-3 pb-2">
          {sections.map(({ id, label }) => {
            const active = activePanel === id;
            const expanded = expandedPanel === id;
            return (
              <React.Fragment key={id}>
                <button
                  type="button"
                  onClick={() => {
                    if (activePanel !== id) {
                      onSelectPanel(id);
                      setExpandedPanel(id);
                    } else {
                      setExpandedPanel((current) => (current === id ? null : id));
                    }
                  }}
                  aria-expanded={expanded}
                  className={`flex items-center w-full py-1.5 text-left text-ui-footnote border-b border-edge-subtle ${
                    active
                      ? "text-ink-light dark:text-ink-dark"
                      : "text-ink-muted dark:text-stone hover:text-ink-light dark:hover:text-ink-dark"
                  }`}
                >
                  <span className={`mr-2 text-xs ${expanded ? "text-sage" : "text-ink-muted/50"}`}>{expanded ? "−" : "+"}</span>
                  <span>{label}</span>
                </button>
                {expanded && (
                  <div className="min-h-0 overflow-hidden">
                    {id === "files" && (
                      <div className="flex items-center gap-1 px-2 py-1.5 mb-1 border-y border-edge-subtle bg-paper-softgray/30 dark:bg-paper-dark-surface/30">
                        <button type="button" onClick={onNewFile} title="New File" aria-label="New File" className="flex items-center gap-1.5 rounded-md px-2 py-1 text-ui-footnote text-ink-muted dark:text-stone hover:text-ink-light dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface">
                          <HiOutlineDocumentAdd size={15} />
                          <span>New File</span>
                        </button>
                        <button type="button" onClick={onNewFolder} title="New Folder" aria-label="New Folder" className="flex items-center gap-1.5 rounded-md px-2 py-1 text-ui-footnote text-ink-muted dark:text-stone hover:text-ink-light dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface">
                          <HiOutlineFolderAdd size={15} />
                          <span>New Folder</span>
                        </button>
                      </div>
                    )}
                    <div className="min-h-0 overflow-y-auto">{children}</div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
