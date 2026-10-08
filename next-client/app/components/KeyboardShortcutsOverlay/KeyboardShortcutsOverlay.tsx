"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAtom } from "jotai";
import { HiOutlineX } from "react-icons/hi";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import { atom_keyboardShortcutsOpen } from "@/app/atoms/ui-atoms";
import { formatShortcut, isMacPlatform } from "@/app/utils/platform";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import Button from "@/app/components/Button";

type ShortcutGroup = {
  title: string;
  shortcuts: { label: string; keys: string }[];
};

// Listed statically rather than read from registered commands: editor
// commands only register on /editor, and the overlay also opens from Settings.
function getShortcutGroups(): ShortcutGroup[] {
  const mac = isMacPlatform();
  const mod = mac ? "⌘" : "Ctrl+";
  const shift = mac ? "⇧" : "Shift+";
  return [
    {
      title: "General",
      shortcuts: [
        { label: "Quick switcher", keys: `${formatShortcut("K")} / ${formatShortcut("P")}` },
        { label: "Command palette", keys: `${formatShortcut("K", { shift: true })} / ${formatShortcut("P", { shift: true })}` },
        { label: "Search note text", keys: formatShortcut("F", { shift: true }) },
        { label: "Select workspace tab", keys: `${formatShortcut("1")}–9` },
        { label: "New file", keys: mac ? "⌃⌥N" : "Ctrl+Alt+N" },
        { label: "Close current tab", keys: formatShortcut("W", { alt: true }) },
        { label: "Save", keys: formatShortcut("S") },
        { label: "Open Explorer", keys: formatShortcut("E", { shift: true }) },
        { label: "Open Explorer (outside the editor)", keys: formatShortcut("B") },
        { label: "Hide / show toolbar", keys: formatShortcut("T", { alt: true }) },
        { label: "Show / hide sidebar", keys: formatShortcut("S", { alt: true }) },
        { label: "AI Chat (with an AI key)", keys: formatShortcut("B", { shift: true }) },
        { label: "Voice input (supported browsers)", keys: formatShortcut("V", { shift: true }) },
        { label: "Pin / unpin in the command palette", keys: formatShortcut("D") },
        { label: "Home feed: move / open note", keys: "↑↓ or J/K / Enter" },
        { label: "Close dialog", keys: "Esc" },
      ],
    },
    {
      title: "Formatting",
      shortcuts: [
        { label: "Bold", keys: formatShortcut("B") },
        { label: "Italic", keys: formatShortcut("I") },
        { label: "Strikethrough", keys: formatShortcut("X", { shift: true }) },
        { label: "Inline code", keys: formatShortcut("E") },
        { label: "Heading 1–6 (again to remove)", keys: `${formatShortcut("", { alt: true })}1–6` },
        { label: "Link", keys: formatShortcut("L", { shift: true }) },
        { label: "Code block", keys: formatShortcut("C", { alt: true }) },
        { label: "Find and replace in note", keys: formatShortcut("F") },
        { label: "Cycle task status", keys: `${mod}Enter` },
        { label: "Indent / outdent list item", keys: "Tab / Shift+Tab" },
        { label: "Open helper at cursor (link, date, diagram…)", keys: `${mod}${shift}Enter` },
        { label: "Undo", keys: formatShortcut("Z") },
        { label: "Redo", keys: mac ? "⌘⇧Z" : "Ctrl+Y" },
      ],
    },
    {
      title: "Tables",
      shortcuts: [
        { label: "Next / previous cell", keys: "Tab / Shift+Tab" },
        { label: "Cell below (adds a row at the end)", keys: "Enter" },
        { label: "Move across cells, leave the table", keys: "Arrows" },
        { label: "Leave the table", keys: "Esc" },
        { label: "Insert row below", keys: `${mod}Enter` },
        { label: "Delete row", keys: `${mod}${shift}Backspace` },
        { label: "Move row up / down", keys: mac ? "⌥↑ / ⌥↓" : "Alt+↑ / Alt+↓" },
        { label: "Move column left / right", keys: mac ? "⌘⌥← / →" : "Ctrl+Alt+← / →" },
        { label: "Row, column & table actions", keys: "Right-click" },
      ],
    },
  ];
}

export default function KeyboardShortcutsOverlay() {
  const [isOpen, setIsOpen] = useAtom(atom_keyboardShortcutsOpen);
  const isMobileChrome = useIsMobileChrome();
  const groups = useMemo(() => getShortcutGroups(), []);
  const [activeTab, setActiveTab] = useState(groups[0].title);

  useEffect(() => {
    if (isOpen) setActiveTab(groups[0].title);
    // Only reset when the overlay opens.
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
        <Button variant="unstyled"
          onClick={close}
          aria-label="Close"
          className={`shrink-0 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg-muted ${
            isMobileChrome ? "w-11 h-11" : "w-8 h-8"
          }`}
        >
          <HiOutlineX size={isMobileChrome ? 20 : 18} />
        </Button>
      </div>
      <div role="tablist" aria-label="Shortcut categories" className="shrink-0 flex items-center gap-1 px-2 pt-2 border-b border-b-edge overflow-x-auto overflow-y-hidden">
        {groups.map((group) => (
          <Button variant="unstyled"
            key={group.title}
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
          </Button>
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
