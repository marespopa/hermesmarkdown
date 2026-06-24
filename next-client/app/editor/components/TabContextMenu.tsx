"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Button from "../../components/Button";

export interface TabContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface TabContextMenuProps {
  x: number;
  y: number;
  items: TabContextMenuItem[];
  onClose: () => void;
}

export default function TabContextMenu({ x, y, items, onClose }: TabContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y, ready: false });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
  }, [onClose]);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clampedX = x + rect.width > vw ? Math.max(8, vw - rect.width - 8) : x;
    const clampedY = y + rect.height > vh ? Math.max(8, vh - rect.height - 8) : y;
    setPos({ x: clampedX, y: clampedY, ready: true });
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      style={{ left: pos.x, top: pos.y }}
      className={`fixed z-50 min-w-[180px] bg-paper-light/90 dark:bg-paper-dark/90 backdrop-blur-xl border border-edge-subtle rounded-2xl font-sans p-1.5 flex flex-col gap-0.5 origin-top-left transition-[opacity,transform] duration-150 ease-out ${pos.ready ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
    >
      {items.map((item) => (
        <Button
          key={item.label}
          variant="menu-item"
          isDisabled={item.disabled}
          onClick={() => {
            if (item.disabled) return;
            item.onClick();
            onClose();
          }}
          className="w-full text-left text-ui-footnote text-ink-light dark:text-ink-dark hover:bg-paper-softgray/80 dark:hover:bg-paper-dark-surface/80 hover:text-ink-light dark:hover:text-ink-dark rounded-xl px-3.5 py-2 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
