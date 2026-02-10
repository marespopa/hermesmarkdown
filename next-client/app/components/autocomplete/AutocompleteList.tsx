import type { AutocompleteGroup } from "./types";

type Props = {
  groupedItems: AutocompleteGroup[];
  activeIndex: number;
  onSelect: (template: string) => void;
};

export default function AutocompleteList({ groupedItems, activeIndex, onSelect }: Props) {
  let itemIndex = -1;

  return (
    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
      {groupedItems.map((group) => (
        <div key={group.category} className="space-y-1">
          <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {group.category}
          </div>
          {group.items.map((item) => {
            itemIndex += 1;
            return (
              <button
                key={item.key}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(item.template);
                }}
                className={`w-full text-left rounded-xl px-3 py-2 text-sm transition ${itemIndex === activeIndex ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.label}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
