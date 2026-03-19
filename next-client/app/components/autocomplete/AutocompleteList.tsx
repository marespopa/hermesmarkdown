"use client";

import { useEffect, useRef } from "react";
import type { AutocompleteGroup } from "./types";
import Button from "@/app/components/Button";

type Props = {
  groupedItems: AutocompleteGroup[];
  activeIndex: number;
  onSelect: (template: string) => void;
};

export default function AutocompleteList({ groupedItems, activeIndex, onSelect }: Props) {
  let itemIndex = -1;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const activeElement = scrollContainer.querySelector(`[data-active="true"]`) as HTMLElement;
    
    if (activeElement) {
        activeElement.scrollIntoView({
            block: "nearest",
            behavior: "auto",
        });
    }
  }, [activeIndex]);

  return (
    <div 
        className="flex flex-col p-1.5 max-h-[320px] overflow-y-auto scroll-smooth
                   bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl 
                   rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl" 
        ref={scrollContainerRef}
    >
      {groupedItems.map((group) => (
        <div key={group.category} className="mb-2 last:mb-0">
          {/* Apple-style Section Header: Smaller, wide-tracking, muted */}
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
            {group.category}
          </div>
          
          <div className="space-y-0.5">
            {group.items.map((item) => {
              itemIndex += 1;
              const idx = itemIndex;
              const isActive = idx === activeIndex;

              return (
                <Button
                  key={item.key}
                  variant="bare"
                  data-active={isActive}
                  onMouseDown={(event: React.MouseEvent) => {
                    event.preventDefault();
                    onSelect(item.template);
                  }}
                  styles={`
                    w-full text-left rounded-lg px-3 py-2 text-[13px] transition-all duration-150 group
                    flex items-center justify-between
                    ${isActive 
                      ? "bg-amber-100 dark:bg-sky-500 text-zinc-900 dark:text-white shadow-sm scale-[1.01]" 
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                    }
                  `}
                >
                  <div className="flex items-center gap-2 truncate">
                    {/* Optional: Add a subtle dash or dot for non-active items to feel like a list */}
                    <span className={`w-1 h-1 rounded-full transition-colors 
                      ${isActive ? "bg-amber-500 dark:bg-white" : "bg-zinc-300 dark:bg-zinc-700"}
                    `} />
                    <span className="font-semibold truncate tracking-tight">{item.label}</span>
                  </div>

                  {/* Keyboard Shortcut Hint (Apple style) */}
                  {isActive && (
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">
                      Enter ↵
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
