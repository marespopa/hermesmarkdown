"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HiCheck } from "react-icons/hi";
import Button from "../../components/Button";
import { MENU_ICON_CLASS, MENU_PANEL_CLASS, MENU_SEPARATOR_CLASS, MENU_SHORTCUT_CLASS } from "./menu-classes";

export interface TabContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  /** Renders a separator above this item, marking the start of a new group. */
  divider?: boolean;
  /** Keyboard shortcut, shown faint at the trailing edge. */
  shortcut?: string;
  /** Checkable item; shows a check while true. */
  checked?: boolean;
}

interface TabContextMenuProps {
  x: number;
  y: number;
  items: TabContextMenuItem[];
  onClose: () => void;
  /** Accessible name for the menu. */
  label?: string;
  /** The button that opened the menu: presses on it don't count as outside
   *  clicks, so it can toggle the menu shut itself. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** "end": `x` is the menu's right edge (a menu under a trailing button). */
  align?: "start" | "end";
}

const EDGE = 8;

// Pop-up menu at a point: tab context menus, the toolbar's More menu, the
// sidebar's section menus and the Tasks page's menus, all in the shared menu
// look (menu-classes.ts). Kept on screen; opens with focus on its first
// item, arrow keys / Home / End move between enabled items, Escape or a
// click outside closes it, and focus goes back where it was. Rendered into
// `document.body`, so the pane header's stacking context (`z-20`) can't let
// editor overlays (e.g. the frontmatter ×) paint over it.
export default function TabContextMenu({ x, y, items, onClose, label, anchorRef, align = "start" }: TabContextMenuProps) {
  const hasCheckable = items.some((item) => item.checked !== undefined);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y, ready: false, fromRight: align === "end" });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef?.current?.contains(target)) return;
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, anchorRef]);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = align === "end" ? x - rect.width : x;
    const clampedX = Math.max(EDGE, Math.min(left, vw - rect.width - EDGE));
    const clampedY = y + rect.height > vh - EDGE ? Math.max(EDGE, vh - rect.height - EDGE) : y;
    // Grows out of the corner nearest where it was opened.
    setPos({ x: clampedX, y: clampedY, ready: true, fromRight: align === "end" || clampedX < left });
  }, [x, y, align]);

  const enabledItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role^=menuitem]:not(:disabled)") ?? []);

  // Focus starts on the first item and returns to what had it on close.
  useEffect(() => {
    const menu = menuRef.current;
    const previous = document.activeElement as HTMLElement | null;
    menu?.querySelector<HTMLElement>("[role^=menuitem]:not(:disabled)")?.focus({ preventScroll: true });
    return () => {
      // Only when focus is still in the menu: an item that opened a dialog, or
      // a click into the editor, keeps the focus it moved.
      const inMenu = !document.activeElement || document.activeElement === document.body || !!menu?.contains(document.activeElement);
      if (previous?.isConnected && inMenu) previous.focus({ preventScroll: true });
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const buttons = enabledItems();
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement as HTMLElement);
    const target =
      event.key === "ArrowDown" ? (current + 1) % buttons.length
      : event.key === "ArrowUp" ? (current - 1 + buttons.length) % buttons.length
      : event.key === "Home" ? 0
      : event.key === "End" ? buttons.length - 1
      : null;
    if (target === null) return;
    event.preventDefault();
    buttons[target].focus();
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      onKeyDown={handleKeyDown}
      style={{ left: pos.x, top: pos.y }}
      className={`${MENU_PANEL_CLASS} min-w-[200px] max-w-[min(320px,calc(100vw-16px))] ${pos.fromRight ? "origin-top-right" : "origin-top-left"} transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${pos.ready ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
    >
      {items.map((item, i) => (
        // Index too: two recent vaults can share a name.
        <React.Fragment key={`${i}:${item.label}`}>
          {item.divider && i > 0 && <div role="separator" className={MENU_SEPARATOR_CLASS} />}
          <Button
            variant="menu-row"
            role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
            aria-checked={item.checked}
            isDisabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onClick();
              onClose();
            }}
          >
            {hasCheckable && (
              <span className="shrink-0 w-4 flex justify-center text-sage">{item.checked && <HiCheck size={14} aria-hidden="true" />}</span>
            )}
            {item.icon && <span className={MENU_ICON_CLASS}>{item.icon}</span>}
            <span className="flex-1 truncate">{item.label}</span>
            {item.shortcut && <span aria-hidden="true" className={MENU_SHORTCUT_CLASS}>{item.shortcut}</span>}
          </Button>
        </React.Fragment>
      ))}
    </div>,
    document.body,
  );
}
