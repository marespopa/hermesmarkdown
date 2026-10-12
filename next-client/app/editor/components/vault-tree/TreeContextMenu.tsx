"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Button from "@/app/components/Button";
import { isMacPlatform } from "@/app/utils/platform";
import { MENU_ICON_CLASS, MENU_ITEM_CLASS, MENU_ITEM_DESTRUCTIVE_CLASS, MENU_PANEL_CLASS, MENU_SEPARATOR_CLASS, MENU_SHORTCUT_CLASS } from "../menu-classes";

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
        className={`${MENU_PANEL_CLASS} animate-in fade-in zoom-in-95 duration-150 ease-out motion-reduce:animate-none`}
      >
        {items.map((item) => (
          <div key={item.label}>
            {item.separated && <div role="separator" className={MENU_SEPARATOR_CLASS} />}
            <Button
              variant="unstyled"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                item.onSelect();
              }}
              className={`${MENU_ITEM_CLASS} ${item.destructive ? MENU_ITEM_DESTRUCTIVE_CLASS : ""}`}
            >
              <span className={`${MENU_ICON_CLASS} ${item.destructive ? "!text-current" : ""}`}>{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.shortcut && <span aria-hidden="true" className={MENU_SHORTCUT_CLASS}>{item.shortcut}</span>}
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
