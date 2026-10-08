"use client";

import React from "react";
import Link from "next/link";
import { HiChevronDown } from "react-icons/hi";
import Button from "@/app/components/Button";
import type { Group } from "../doc-primitives";

interface DocsLocalNavProps {
  groups: Group[];
  /** Id of the section in view, marked in the section links. */
  activeGroupId: string;
  /** Distance from the top of the viewport (below the site header). */
  top: number;
  onOpenContents: () => void;
}

// The docs bar that sticks under the site header: page title, one link per
// section (wide screens), a Contents button (narrow screens) and Open Editor.
export default function DocsLocalNav({ groups, activeGroupId, top, onOpenContents }: DocsLocalNavProps) {
  const activeLabel = groups.find((group) => group.id === activeGroupId)?.label;
  return (
    <div
      className="sticky z-40 border-b border-black/5 dark:border-white/10 bg-paper-pale/80 dark:bg-paper-dark/80 backdrop-blur-xl"
      style={{ top }}
    >
      <div className="container max-w-screen-xl flex h-12 items-center gap-6">
        <a href="#top" className="shrink-0 text-[19px] font-semibold tracking-tight text-fg">
          Documentation
        </a>

        <ul className="hidden lg:flex flex-1 items-center justify-end gap-5">
          {groups.map((group) => (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                aria-current={group.id === activeGroupId ? "location" : undefined}
                className={`text-[13px] transition-colors ${
                  group.id === activeGroupId ? "text-fg" : "text-fg-muted hover:text-fg"
                }`}
              >
                {group.label}
              </a>
            </li>
          ))}
        </ul>

        <Button
          variant="unstyled"
          onClick={onOpenContents}
          aria-haspopup="dialog"
          className="lg:hidden ml-auto flex min-w-0 items-center gap-1 text-[13px] text-fg-muted hover:text-fg"
        >
          <span className="truncate">{activeLabel ?? "Contents"}</span>
          <HiChevronDown size={14} aria-hidden="true" className="shrink-0" />
        </Button>

        <Link
          href="/editor"
          className="shrink-0 rounded-full bg-accent px-3.5 py-1 text-[13px] font-medium text-white dark:text-paper-dark transition-opacity hover:opacity-90"
        >
          Open Editor
        </Link>
      </div>
    </div>
  );
}
