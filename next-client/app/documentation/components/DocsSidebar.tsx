"use client";

import React from "react";
import type { Group } from "../doc-primitives";

interface DocsSidebarProps {
  groups: Group[];
  /** Id of the article in view, highlighted in the list. */
  activeId: string;
  /** Called after a link is followed (closes the mobile sheet). */
  onNavigate?: () => void;
}

// The table of contents: each section's articles under a small heading, the
// article in view highlighted. Used in the desktop sidebar and the mobile
// Contents sheet.
export default function DocsSidebar({ groups, activeId, onNavigate }: DocsSidebarProps) {
  return (
    <nav aria-label="Table of contents" className="space-y-7">
      {groups.map((group) => (
        <div key={group.id}>
          <a
            href={`#${group.id}`}
            onClick={onNavigate}
            className="block px-3 mb-1.5 text-[13px] font-semibold text-fg hover:text-accent transition-colors"
          >
            {group.label}
          </a>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.id === activeId;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={onNavigate}
                    aria-current={active ? "location" : undefined}
                    className={`block rounded-lg px-3 py-1.5 text-[14px] leading-snug transition-colors ${
                      active ? "bg-chrome text-fg font-medium" : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {item.title}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
