"use client";

import React from "react";
import { HiChevronDown, HiChevronRight } from "react-icons/hi";
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

// Collapse/expand chevrons drawn at the right edge of foldable callouts and
// the frontmatter block.
export default function FoldChevrons({ chevrons, onToggle }: FoldChevronsProps) {
  return (
    <>
      {chevrons.map((chevron) => {
        const what = chevron.kind === "frontmatter" ? "frontmatter" : "callout";
        const label = `${chevron.collapsed ? "Expand" : "Collapse"} ${what}`;
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
            {chevron.collapsed ? <HiChevronRight size={13} /> : <HiChevronDown size={13} />}
          </Button>
        );
      })}
    </>
  );
}
