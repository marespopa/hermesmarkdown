"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Button from "@/app/components/Button";
import { isMacPlatform } from "@/app/utils/platform";

export interface TreeMenuItem {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  shortcut?: string;
  destructive?: boolean;
  // Draws a divider above this item.
  separated?: boolean;
}

interface TreeContextMenuProps {
  x: number;
  y: number;
  label: string;
  items: TreeMenuItem[];
  onClose: () => void;
}

const MENU_WIDTH = 200;
const EDGE = 8;

export const trashShortcut = () => (isMacPlatform() ? "⌘⌫" : "Del");
export const renameShortcut = () => (isMacPlatform() ? "↩" : "F2");

// The file tree's one menu, for right-click (at the pointer) and the rows'
// ⋯ buttons alike. Kept on screen; arrow keys move between items, Escape or
// a click outside closes it.
export function TreeContextMenu({ x, y, label, items, onClose }: TreeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });

  useLayoutEffect(() => {
    const height = menuRef.current?.offsetHeight ?? 0;
    setPosition({
      left: Math.max(EDGE, Math.min(x, window.innerWidth - MENU_WIDTH - EDGE)),
      top: y + height > window.innerHeight - EDGE ? Math.max(EDGE, y - height) : y,
    });
  }, [x, y]);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, []);

  const moveFocus = (step: number) => {
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    if (buttons.length === 0) return;
    const current = buttons.indexOf(document.activeElement as HTMLElement);
    buttons[(current + step + buttons.length) % buttons.length].focus();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
      />
      <div
        ref={menuRef}
        role="menu"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Escape") { e.preventDefault(); onClose(); }
          else if (e.key === "ArrowDown") { e.preventDefault(); moveFocus(1); }
          else if (e.key === "ArrowUp") { e.preventDefault(); moveFocus(-1); }
        }}
        style={{ ...position, width: MENU_WIDTH }}
        className="fixed z-50 bg-paper-light dark:bg-paper-dark backdrop-blur-xl border border-edge-subtle rounded-xl py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150 ease-out"
      >
        {items.map((item) => (
          <div key={item.label}>
            {item.separated && <div role="separator" className="my-1 h-px bg-edge-subtle" />}
            <Button
              variant="menu-item"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                item.onSelect();
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-ui-footnote font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:bg-neutral-100 dark:focus:bg-neutral-800 outline-none transition-colors ${
                item.destructive ? "text-red-500" : ""
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && <span className="text-ui-caption text-fg-faint">{item.shortcut}</span>}
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
