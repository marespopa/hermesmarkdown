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
        className="flex flex-col gap-1 max-h-60 overflow-y-auto" 
        ref={scrollContainerRef}
    >
      {groupedItems.map((group) => (
        <div key={group.category} className="space-y-1">
          <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {group.category}
          </div>
          {group.items.map((item) => {
            itemIndex += 1;
            const idx = itemIndex;
            return (
              <Button
                key={item.key}
                variant="bare"
                data-active={idx === activeIndex}
                onMouseDown={(event: React.MouseEvent) => {
                  event.preventDefault();
                  onSelect(item.template);
                }}
                styles={`w-full text-left rounded-xl px-3 py-2 text-sm transition ${idx === activeIndex ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.label}</span>
                </div>
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
