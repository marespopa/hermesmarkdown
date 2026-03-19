"use client";

import AutocompleteList from "@/app/components/autocomplete/AutocompleteList";
import type { AutocompleteGroup, AutocompleteItem } from "@/app/components/autocomplete/types";

type AutocompleteData = {
  flatItems: AutocompleteItem[];
  groupedItems: AutocompleteGroup[];
};

type Props = {
  autocompleteData: AutocompleteData;
  activeIndex: number;
  onSelect: (template: string) => void;
  showInline?: boolean;
};

export default function AutocompletePanel({
  autocompleteData,
  activeIndex,
  onSelect,
  showInline = false,
}: Props) {
  
  // The content of the panel, now using refined Apple-style typography
  const listContent = (
    <div className="flex flex-col gap-1">
      <AutocompleteList
        groupedItems={autocompleteData.groupedItems}
        activeIndex={activeIndex}
        onSelect={onSelect}
      />
    </div>
  );

  // If showing inline (e.g., in a sidebar), we strip the absolute positioning and heavy shadows
  if (showInline) {
    return (
      <div className="w-full bg-transparent">
        {listContent}
      </div>
    );
  }

  return (
    <div 
      className="absolute left-0 right-0 top-full mt-3 z-50
                 animate-in fade-in zoom-in-95 duration-200 ease-out
                 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-2xl
                 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 
                 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]
                 p-1"
    >
      {/* Subtle top 'Inner Glow' for depth */}
      <div className="absolute inset-0 rounded-[1.5rem] border border-white/20 pointer-events-none" />
      
      {listContent}

      {/* Footer: Quick Hint */}
      <div className="mt-1 px-4 py-2 border-t border-zinc-100 dark:border-zinc-800/50">
        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-medium">
          Use <span className="dark:text-zinc-400">↑↓</span> to navigate • <span className="dark:text-zinc-400">Esc</span> to dismiss
        </p>
      </div>
    </div>
  );
}
