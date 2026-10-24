"use client";

import React, { useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { HiOutlineBookOpen, HiOutlineCog, HiOutlineQuestionMarkCircle } from "react-icons/hi";
import { atom_keyboardShortcutsOpen } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { formatShortcut } from "@/app/utils/platform";
import TabContextMenu from "../TabContextMenu";
import { SIDEBAR_ICON_CLASS, sidebarItemClass } from "./sidebar-classes";

const ICON = { size: 15, "aria-hidden": true, className: SIDEBAR_ICON_CLASS } as const;

// The sidebar's foot, below the scrolling library and set apart by a
// hairline: Settings (current while on a Settings page) and Help, whose menu
// opens the Documentation in a new tab (the note stays put, as the palette's
// Open Documentation does) or the Keyboard Shortcuts overlay.
export default function SidebarFooter() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const setShortcutsOpen = useSetAtom(atom_keyboardShortcutsOpen);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const helpRef = useRef<HTMLButtonElement>(null);
  const onSettings = pathname.startsWith("/editor/settings");

  return (
    <div className="shrink-0 flex flex-col gap-px border-t border-edge-subtle px-2 py-1.5">
      <Button
        variant="unstyled"
        onClick={() => router.push("/editor/settings")}
        aria-current={onSettings ? "page" : undefined}
        className={sidebarItemClass(onSettings)}
      >
        <HiOutlineCog {...ICON} />
        <span className="truncate">Settings</span>
      </Button>
      <Button
        ref={helpRef}
        variant="unstyled"
        onClick={() => {
          const anchor = helpRef.current?.getBoundingClientRect();
          // Beside the row, out over the page: the menu lifts itself to fit
          // above the window's bottom edge without covering the footer.
          setMenu((open) => (open || !anchor ? null : { x: anchor.right + 4, y: anchor.top }));
        }}
        aria-haspopup="menu"
        aria-expanded={!!menu}
        className={`${sidebarItemClass(false)} ${menu ? "bg-fill" : ""}`}
      >
        <HiOutlineQuestionMarkCircle {...ICON} />
        <span className="truncate">Help</span>
      </Button>
      {menu && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          label="Help"
          anchorRef={helpRef}
          onClose={() => setMenu(null)}
          items={[
            {
              label: "Documentation",
              icon: <HiOutlineBookOpen size={14} aria-hidden="true" />,
              onClick: () => { window.open("/documentation", "_blank", "noopener"); },
            },
            {
              label: "Keyboard Shortcuts",
              shortcut: formatShortcut("?"),
              onClick: () => setShortcutsOpen(true),
            },
          ]}
        />
      )}
    </div>
  );
}
