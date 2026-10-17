"use client";

import React, { useRef, useState } from "react";
import { useAtom } from "jotai";
import { HiChevronRight, HiOutlineDotsHorizontal } from "react-icons/hi";
import { atom_sidebarCollapsed } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import TabContextMenu from "../TabContextMenu";

export interface SectionMenuItem {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

// A section header's ⋯ menu, in the shared menu look (TabContextMenu).
function SectionMenu({ label, items }: { label: string; items: SectionMenuItem[] }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="unstyled"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!position}
        title={label}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition(position ? null : { x: rect.right, y: rect.bottom + 4 });
        }}
        // Shown with the header's hover or keyboard focus, or while open.
        className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md transition-[color,background-color,opacity] focus-visible:opacity-100 ${
          position ? "opacity-100 text-fg bg-black/5 dark:bg-white/10" : "opacity-0 group-hover/section:opacity-100 text-fg-faint hover:text-fg hover:bg-black/5 dark:hover:bg-white/10"
        }`}
      >
        <HiOutlineDotsHorizontal size={14} aria-hidden="true" />
      </Button>
      {position && (
        <TabContextMenu
          x={position.x}
          y={position.y}
          align="end"
          label={label}
          anchorRef={buttonRef}
          onClose={() => setPosition(null)}
          items={items.map((item) => ({ label: item.label, icon: item.icon, onClick: item.onSelect }))}
        />
      )}
    </>
  );
}

// A titled, collapsible group: a full-width hairline above it sets it apart
// from the header or the section before; its header is a caption led by a disclosure chevron that is
// always shown (right when folded, down when open), and the whole header
// folds or unfolds it. The ⋯ menu shows on hover or focus.
// Collapsed sections are remembered (atom_sidebarCollapsed, by title);
// `defaultCollapsed` starts one folded until it's opened once.
export default function SidebarSection({
  title,
  menu,
  defaultCollapsed = false,
  children,
}: {
  title: string;
  menu?: SectionMenuItem[];
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useAtom(atom_sidebarCollapsed);
  const expanded = !(collapsed[title] ?? defaultCollapsed);
  const setExpanded = (next: boolean) => setCollapsed((prev) => ({ ...prev, [title]: !next }));
  return (
    <section aria-label={title} className="-mx-2 flex flex-col border-t border-edge px-2 pt-2.5 pb-3">
      <div className="group/section flex items-center gap-0.5 h-7 pr-1">
        <Button
          variant="unstyled"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex flex-1 min-w-0 items-center gap-1.5 h-7 px-1.5 rounded-md text-ui-caption font-semibold text-fg-muted select-none transition-colors hover:text-fg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sage"
        >
          <HiChevronRight
            size={12}
            aria-hidden="true"
            className={`shrink-0 text-fg-faint transition-transform duration-150 motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
          />
          <span className="flex-1 min-w-0 truncate text-left">{title}</span>
        </Button>
        {menu && <SectionMenu label={`${title} options`} items={menu} />}
      </div>
      {expanded && <div className="flex flex-col gap-px pt-1">{children}</div>}
    </section>
  );
}
