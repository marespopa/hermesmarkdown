"use client";

import React, { useState } from "react";
import { HiOutlineDocumentText } from "react-icons/hi";
import Button from "@/app/components/Button";
import TabContextMenu, { type TabContextMenuItem } from "../TabContextMenu";

export interface SidebarNoteItem {
  path: string;
  title: string;
  /** Short trailing text, e.g. a day label. */
  meta?: string | null;
  /** Locked (sensitive) note: no title tooltip. */
  isSensitive?: boolean;
}

interface SidebarNoteListProps {
  items: SidebarNoteItem[];
  currentPath: string | null;
  onOpen: (path: string) => void;
  /** Right-click actions for a row (e.g. Unpin). */
  menuItems?: (path: string) => TabContextMenuItem[];
  emptyText?: string;
  icon?: React.ReactNode;
}

export const SIDEBAR_ITEM_CLASS = "flex items-center gap-2 h-7 px-2 rounded-md text-ui-footnote text-left transition-colors";
export const SIDEBAR_ITEM_CURRENT_CLASS = "bg-surface-raised text-ink-light dark:text-ink-dark font-medium";
export const SIDEBAR_ITEM_IDLE_CLASS = "text-fg-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-fg";

// A list of notes by title (Pinned, Recent): the current one marked with
// aria-current, an optional short label at the trailing edge, and an
// optional right-click menu per row.
export default function SidebarNoteList({ items, currentPath, onOpen, menuItems, emptyText, icon }: SidebarNoteListProps) {
  const [menu, setMenu] = useState<{ x: number; y: number; path: string } | null>(null);

  if (items.length === 0) {
    return emptyText ? <p className="px-2 py-1 text-ui-footnote text-fg-faint">{emptyText}</p> : null;
  }

  return (
    <>
      {items.map((item) => {
        const isCurrent = item.path === currentPath;
        return (
          <Button
            key={item.path}
            variant="unstyled"
            onClick={() => onOpen(item.path)}
            onContextMenu={menuItems ? (event) => {
              event.preventDefault();
              setMenu({ x: event.clientX, y: event.clientY, path: item.path });
            } : undefined}
            aria-current={isCurrent ? "page" : undefined}
            title={item.isSensitive ? undefined : item.title}
            className={`${SIDEBAR_ITEM_CLASS} ${isCurrent ? SIDEBAR_ITEM_CURRENT_CLASS : SIDEBAR_ITEM_IDLE_CLASS}`}
          >
            {icon ?? <HiOutlineDocumentText size={15} aria-hidden="true" className="shrink-0 opacity-70" />}
            <span className="flex-1 min-w-0 truncate">{item.title}</span>
            {item.meta && <span className="shrink-0 text-ui-micro text-fg-faint">{item.meta}</span>}
          </Button>
        );
      })}
      {menu && menuItems && (
        <TabContextMenu x={menu.x} y={menu.y} items={menuItems(menu.path)} label="Note actions" onClose={() => setMenu(null)} />
      )}
    </>
  );
}
