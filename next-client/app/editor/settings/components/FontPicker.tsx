"use client";

import React from "react";
import { HiCheck } from "react-icons/hi";

export interface FontOption {
  label: string;
  value: string;
}

interface FontPickerProps {
  fonts: FontOption[];
  value: string;
  onChange: (value: string) => void;
  previewText?: string;
}

// CSS-columns masonry: cards flow top-to-bottom per column rather than in
// strict rows, so labels of different lengths don't force uniform row
// heights. Two columns fits mobile widths; more open up on wider screens.
export default function FontPicker({
  fonts,
  value,
  onChange,
  previewText = "The quick brown fox 0123",
}: FontPickerProps) {
  return (
    <div className="columns-2 sm:columns-3 md:columns-4 gap-2">
      {fonts.map((f) => {
        const isActive = value === f.value;
        return (
          <button
            key={f.label}
            type="button"
            onClick={() => onChange(f.value)}
            aria-pressed={isActive}
            className={`mb-2 w-full break-inside-avoid flex flex-col items-start gap-1.5 rounded-xl border px-3 py-3 text-left transition-colors focus:outline-none ${
              isActive
                ? "border-sage bg-sage/5 dark:bg-sage/10"
                : "border-neutral-100 dark:border-neutral-800/40 hover:border-sage/40"
            }`}
          >
            <div className="w-full flex items-center justify-between gap-2">
              <span
                className={`text-ui-footnote font-medium leading-none truncate ${
                  isActive ? "text-sage dark:text-sage" : "text-ink-light dark:text-ink-dark"
                }`}
              >
                {f.label}
              </span>
              {/* Always rendered (opacity toggled, not mounted) so the row's height
                  never changes on selection — an unmount/remount here was enough
                  to shift item heights and reshuffle the whole masonry grid. */}
              <HiCheck
                size={14}
                className={`shrink-0 text-sage transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`}
              />
            </div>
            <span
              style={{ fontFamily: f.value }}
              // Fixed to 2 lines so this font's metrics finishing their swap-in load
              // can't change the card's height — that's what was reshuffling the
              // whole masonry grid (CSS columns rebalance on any item's height change).
              className="text-[11px] leading-snug text-neutral-400 dark:text-neutral-500 break-words line-clamp-2 h-[2.6em]"
            >
              {previewText}
            </span>
          </button>
        );
      })}
    </div>
  );
}
