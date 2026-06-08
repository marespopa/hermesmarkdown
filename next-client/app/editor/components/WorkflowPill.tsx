"use client";

import React from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { TAG_COLORS, PILL_CONTAINER_CLASSES } from "./constants";
import Button from "../../components/Button";

interface WorkflowPillProps {
  tag: string;
  pos: { top: number; left: number };
  onPrev: () => void;
  onNext: () => void;
  noHash?: boolean;
}

export function WorkflowPill({ tag, pos, onPrev, onNext, noHash }: WorkflowPillProps) {
  const colorClass = TAG_COLORS[tag] ?? "text-zinc-500 dark:text-zinc-400";

  return (
    <div
      style={{ top: pos.top, left: pos.left }}
      className={PILL_CONTAINER_CLASSES}
      onMouseDown={(e) => e.preventDefault()}
    >
      <Button
        variant="pill-icon"
        onClick={onPrev}
        aria-label="Previous workflow state"
        className="p-0.5 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
      >
        <HiChevronLeft className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
      </Button>
      <span className={`text-xs font-bold px-0.5 ${colorClass}`}>{noHash ? tag : `#${tag}`}</span>
      <Button
        variant="pill-icon"
        onClick={onNext}
        aria-label="Next workflow state"
        className="p-0.5 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
      >
        <HiChevronRight className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
      </Button>
    </div>
  );
}
