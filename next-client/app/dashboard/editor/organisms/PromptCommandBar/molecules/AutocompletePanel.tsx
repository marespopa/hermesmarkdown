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
  const listContent = (
    <>
      <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 px-2 pb-1">
        Commands
      </div>
      <AutocompleteList
        groupedItems={autocompleteData.groupedItems}
        activeIndex={activeIndex}
        onSelect={onSelect}
      />
    </>
  );

  if (showInline) {
    return <>{listContent}</>;
  }

  return (
    <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-lg p-2 z-20">
      {listContent}
    </div>
  );
}
