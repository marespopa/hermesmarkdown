"use client";

import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { HiOutlineX } from "react-icons/hi";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import { atom_keyboardShortcutsOpen } from "@/app/atoms/ui-atoms";
import { formatShortcut, isMacPlatform } from "@/app/utils/platform";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";

type ShortcutGroup = {
  title: string;
  shortcuts: { label: string; keys: string }[];
};

// Static reference list — deliberately not derived from the command palette
// registry (app/components/CommandPalette/CommandPaletteContext.tsx), since
// most global bindings (page.tsx's keydown handler, CodeMirror's
// formatKeymap/historyKeymap, the table keymap) aren't Command entries and
// only a handful of Commands set `shortcut` at all. Keep this in sync by
// hand when bindings change.
function getShortcutGroups(): ShortcutGroup[] {
  const mac = isMacPlatform();
  return [
    {
      title: "General",
      shortcuts: [
        { label: "Command palette", keys: formatShortcut("P", { shift: true }) },
        { label: "Save", keys: formatShortcut("S") },
        { label: "Toggle sidebar", keys: formatShortcut("E", { shift: true }) },
        { label: "Open AI chat", keys: formatShortcut("B", { shift: true }) },
        { label: "Toggle voice input", keys: formatShortcut("V", { shift: true }) },
        { label: "Close dialog / collapse sidebar", keys: "Esc" },
      ],
    },
    {
      title: "Formatting",
      shortcuts: [
        { label: "Bold", keys: formatShortcut("B") },
        { label: "Italic", keys: formatShortcut("I") },
        { label: "Strikethrough", keys: formatShortcut("X", { shift: true }) },
        { label: "Inline code", keys: formatShortcut("E") },
        { label: "Undo", keys: formatShortcut("Z") },
        { label: "Redo", keys: mac ? "⌘⇧Z" : "Ctrl+Y" },
      ],
    },
    {
      title: "Tables",
      shortcuts: [
        { label: "Next / previous cell", keys: "Tab / Shift+Tab" },
        { label: "New row", keys: "Enter" },
        { label: "Move up / down a row", keys: "↑ / ↓" },
      ],
    },
    {
      title: "Dates",
      shortcuts: [{ label: "Open date picker", keys: "Alt+↓" }],
    },
  ];
}

export default function KeyboardShortcutsOverlay() {
  const [isOpen, setIsOpen] = useAtom(atom_keyboardShortcutsOpen);
  const isMobileChrome = useIsMobileChrome();
  const groups = getShortcutGroups();
  const [activeTab, setActiveTab] = useState(groups[0].title);

  useEffect(() => {
    if (isOpen) setActiveTab(groups[0].title);
    // Only reset when the overlay opens — not on every render, since
    // `groups` is a fresh array each time (getShortcutGroups() isn't memoized).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const close = () => setIsOpen(false);
  const currentGroup = groups.find((g) => g.title === activeTab) ?? groups[0];

  return (
    <OverlayPanel
      isOpen={isOpen}
      onClose={close}
      variant={isMobileChrome ? "sheet" : "modal"}
      backdrop="dim"
      backdropClassName={`transition-opacity duration-overlay-backdrop ${isOpen ? "opacity-100" : "opacity-0"}`}
      exitDurationMs={100}
      containerClassName={isMobileChrome ? "" : "items-center justify-center p-4"}
      panelClassName={
        isMobileChrome
          ? "flex-1 flex flex-col bg-chrome animate-in slide-in-from-bottom duration-overlay-panel"
          : "w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] flex flex-col bg-chrome border border-edge rounded-2xl overflow-hidden"
      }
      ariaLabelledBy="keyboard-shortcuts-title"
    >
      <div className="p-4 border-b border-b-edge flex items-center justify-between">
        <h2 id="keyboard-shortcuts-title" className="text-ui-title-3 text-fg">
          Keyboard shortcuts
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className={`shrink-0 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg-muted ${
            isMobileChrome ? "w-11 h-11" : "w-8 h-8"
          }`}
        >
          <HiOutlineX size={isMobileChrome ? 20 : 18} />
        </button>
      </div>
      <div role="tablist" aria-label="Shortcut categories" className="shrink-0 flex items-center gap-1 px-2 pt-2 border-b border-b-edge overflow-x-auto overflow-y-hidden">
        {groups.map((group) => (
          <button
            key={group.title}
            type="button"
            role="tab"
            aria-selected={activeTab === group.title}
            onClick={() => setActiveTab(group.title)}
            className={`shrink-0 px-3 py-2 text-ui-footnote border-b-2 -mb-px transition-colors ${
              activeTab === group.title
                ? "border-accent text-fg"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {group.title}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div role="tabpanel" className="flex flex-col gap-1.5">
          {currentGroup.shortcuts.map((shortcut) => (
            <div key={shortcut.label} className="flex items-center justify-between gap-3 text-[14px] text-fg">
              <span className="truncate">{shortcut.label}</span>
              <span className="shrink-0 font-mono text-ui-micro text-fg-muted px-1.5 py-0.5 rounded border border-edge bg-paper-light dark:bg-paper-dark">
                {shortcut.keys}
              </span>
            </div>
          ))}
        </div>
      </div>
    </OverlayPanel>
  );
}
