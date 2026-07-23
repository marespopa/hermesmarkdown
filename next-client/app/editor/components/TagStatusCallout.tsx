"use client";

import React from "react";
import { TAG_COLORS } from "./constants";

interface TagStatusCalloutProps {
  tag: string;
  states: string[];
  pos: { top: number; left: number };
  onSelect: (state: string) => void;
}

// Segmented state picker for the Rendered-mode #draft/#todo-style tags —
// one click jumps straight to the chosen state instead of Source mode's
// WorkflowPill prev/next stepper, since a click-only surface (no cursor to
// linger on) makes "how many clicks until I reach X" ambiguous. All states
// render as tappable pills so it also works as a one-tap target on mobile.
export function TagStatusCallout({ tag, states, pos, onSelect }: TagStatusCalloutProps) {
  return (
    <div
      style={{ top: pos.top, left: pos.left }}
      className="absolute z-40 flex items-center gap-1 p-1 bg-paper-light dark:bg-paper-dark border border-edge rounded-md shadow-sm pointer-events-auto select-none transition-all duration-200 ease-in-out"
      onMouseDown={(e) => e.preventDefault()}
    >
      {states.map((state) => {
        const isActive = state === tag;
        const colorClass = TAG_COLORS[state] ?? "text-zinc-500 dark:text-zinc-400";
        return (
          <button
            key={state}
            type="button"
            onClick={() => onSelect(state)}
            aria-pressed={isActive}
            className={`px-2 py-1 min-h-[28px] rounded text-xs font-bold transition-colors ${colorClass} ${
              isActive
                ? "bg-paper-softgray dark:bg-paper-dark-surface"
                : "hover:bg-paper-softgray dark:hover:bg-paper-dark-surface"
            }`}
          >
            #{state}
          </button>
        );
      })}
    </div>
  );
}
