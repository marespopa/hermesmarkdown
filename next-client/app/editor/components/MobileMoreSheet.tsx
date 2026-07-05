"use client";

import React from "react";
import Portal from "@/app/components/Portal/Portal";
import { HiOutlineX } from "react-icons/hi";
import { useBackButtonClose } from "@/app/hooks/use-back-button-close";
import { TabContextMenuItem } from "./TabContextMenu";

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: TabContextMenuItem[];
}

export default function MobileMoreSheet({ isOpen, onClose, items }: MobileMoreSheetProps) {
  useBackButtonClose(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[1000] flex flex-col bg-surface animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge-subtle shrink-0">
          <span className="text-ui-subhead font-medium text-fg">More</span>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-fg-muted">
            <HiOutlineX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {items.map((item, i) => (
            <React.Fragment key={item.label}>
              {item.divider && i > 0 && (
                <div className="my-2 mx-2 border-t border-edge-subtle" />
              )}
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick();
                  onClose();
                }}
                className="w-full flex items-center gap-3 text-left text-ui-subhead text-fg px-3 py-3 rounded-xl active:bg-paper-softgray dark:active:bg-paper-dark-surface/60 transition-colors disabled:opacity-40 disabled:active:bg-transparent"
              >
                {item.icon && <span className="shrink-0 opacity-70">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </Portal>
  );
}
