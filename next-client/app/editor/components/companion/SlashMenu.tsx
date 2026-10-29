"use client";

import React from "react";
import Button from "@/app/components/Button";

export interface SlashOption {
  command: string;
  description?: string;
}

interface SlashMenuProps {
  options: SlashOption[];
  activeIndex: number;
  onSelect: (option: SlashOption) => void;
}

// The / menu floating above the companion's input: its own commands,
// filtered by what's typed after the slash.
export default function SlashMenu({ options, activeIndex, onSelect }: SlashMenuProps) {
  return (
    <div role="listbox" aria-label="Commands" className="absolute bottom-full left-0 right-0 mb-1 glass-panel rounded-xl overflow-hidden z-50">
      {options.map((option, i) => (
        // mousedown (not click) so the textarea keeps focus
        <Button
          variant="unstyled"
          key={option.command}
          role="option"
          aria-selected={i === activeIndex}
          onMouseDown={(e) => { e.preventDefault(); onSelect(option); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
            i === activeIndex ? "bg-sage/10 text-sage" : "text-ink-light dark:text-ink-dark hover:bg-fill"
          }`}
        >
          <span className="text-ui-footnote font-medium shrink-0">{option.command}</span>
          {option.description && (
            <span className="text-ui-caption text-neutral-400 dark:text-neutral-500 truncate ml-auto">{option.description}</span>
          )}
        </Button>
      ))}
    </div>
  );
}
