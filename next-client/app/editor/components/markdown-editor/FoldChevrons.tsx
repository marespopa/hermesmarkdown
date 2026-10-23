"use client";

import React from "react";
import { HiChevronDown, HiChevronRight } from "react-icons/hi";
import Button from "@/app/components/Button";

export interface FoldChevron {
  blockId: string;
  top: number;
  collapsed: boolean;
  kind?: "callout" | "details";
}

interface FoldChevronsProps {
  chevrons: FoldChevron[];
  onToggle: (chevron: FoldChevron) => void;
}

// Collapse/expand chevrons drawn at the right edge of foldable callouts and
// `<details>` sections. Headings fold from their own chevrons in the
// margin (`codemirror/heading-fold.ts`).
export default function FoldChevrons({ chevrons, onToggle }: FoldChevronsProps) {
  return (
    <>
      {chevrons.map((chevron) => {
        const label = `${chevron.collapsed ? "Expand" : "Collapse"} ${chevron.kind === "details" ? "section" : "callout"}`;
        return (
          <Button
            variant="unstyled"
            key={chevron.blockId}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle(chevron);
            }}
            className="absolute right-1 z-20 p-0.5 rounded text-ink-muted dark:text-fg-faint hover:text-fg dark:hover:text-fg"
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
