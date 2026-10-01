"use client";

import React from "react";
import { HiChevronDown, HiChevronRight, HiX } from "react-icons/hi";
import Button from "@/app/components/Button";

export interface FoldChevron {
  blockId: string;
  top: number;
  collapsed: boolean;
  kind: "callout" | "frontmatter";
}

interface FoldChevronsProps {
  chevrons: FoldChevron[];
  onToggle: (chevron: FoldChevron) => void;
}

// Collapse/expand chevrons drawn at the right edge of foldable callouts, and a
// close (×) on expanded frontmatter: collapsed frontmatter is hidden outright
// and comes back from the header's metadata toggle, so it only ever closes.
export default function FoldChevrons({ chevrons, onToggle }: FoldChevronsProps) {
  return (
    <>
      {chevrons.map((chevron) => {
        const isFrontmatter = chevron.kind === "frontmatter";
        const label = isFrontmatter
          ? "Hide metadata"
          : `${chevron.collapsed ? "Expand" : "Collapse"} callout`;
        return (
          <Button
            variant="unstyled"
            key={chevron.blockId}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle(chevron);
            }}
            className="absolute right-1 z-20 p-0.5 rounded text-ink-muted dark:text-fg-faint hover:text-sage dark:hover:text-sage"
            style={{ top: chevron.top }}
            title={label}
            aria-label={label}
          >
            {isFrontmatter
              ? <HiX size={13} />
              : chevron.collapsed ? <HiChevronRight size={13} /> : <HiChevronDown size={13} />}
          </Button>
        );
      })}
    </>
  );
}
