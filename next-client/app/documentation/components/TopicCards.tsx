"use client";

import React from "react";
import type { IconType } from "react-icons";
import {
  HiOutlineBookOpen,
  HiOutlineCog,
  HiOutlineDeviceMobile,
  HiOutlineFolder,
  HiOutlinePencilAlt,
  HiOutlinePlay,
  HiOutlineSparkles,
} from "react-icons/hi";
import type { Group } from "../doc-primitives";

const ICONS: Record<string, IconType> = {
  "get-started": HiOutlinePlay,
  editor: HiOutlinePencilAlt,
  vault: HiOutlineFolder,
  "ai-features": HiOutlineSparkles,
  settings: HiOutlineCog,
  mobile: HiOutlineDeviceMobile,
};

// One rounded card per documentation section: icon, name, one-line summary
// and a link down to the section.
export default function TopicCards({ groups }: { groups: Group[] }) {
  return (
    <nav aria-label="Topics">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          const Icon = ICONS[group.id] ?? HiOutlineBookOpen;
          return (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                className="group flex h-full flex-col rounded-[22px] border border-edge-subtle bg-surface-raised p-6 transition-shadow duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-chrome text-accent">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <span className="mt-5 text-[19px] font-semibold tracking-tight text-fg">{group.label}</span>
                <span className="mt-1.5 flex-1 text-[15px] leading-snug text-fg-muted">{group.summary}</span>
                <span className="mt-4 text-[15px] text-accent group-hover:underline">
                  {group.items.length} {group.items.length === 1 ? "article" : "articles"} ›
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
