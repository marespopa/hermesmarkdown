"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "@/app/components/Button";
import BareInput from "@/app/components/Input/BareInput";
import type { DialogSelectOption } from "@/app/atoms/atoms";

// Past this many options the list gets a filter field (typing narrows it,
// ↑/↓ pick, Return chooses) instead of a long scroll.
const FILTER_THRESHOLD = 6;

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// The choices of a "select" dialog (e.g. the folder picker for a new note).
export default function SelectOptionList({
  options,
  onSelect,
}: {
  options: DialogSelectOption[];
  onSelect: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const filterable = options.length > FILTER_THRESHOLD;
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options;

  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div className="flex flex-col gap-2 py-2 min-h-0">
      {filterable && (
        <BareInput
          autoFocus
          aria-label="Filter"
          placeholder="Filter…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const step = e.key === "ArrowDown" ? 1 : -1;
              setActiveIndex((i) => Math.max(0, Math.min(shown.length - 1, i + step)));
            } else if (e.key === "Enter") {
              // The dialog's own Return (confirm) would close it unchosen.
              e.preventDefault();
              e.stopPropagation();
              if (shown[activeIndex]) onSelect(shown[activeIndex].value);
            }
          }}
          className="w-full rounded-xl border border-edge-subtle bg-paper-pale dark:bg-paper-dark px-3 py-2 text-ui-subhead text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-sage/40"
        />
      )}
      <div ref={listRef} role="listbox" aria-label="Options" className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto">
        {shown.map((opt, index) => (
          <Button
            key={opt.value}
            data-index={index}
            role="option"
            aria-selected={filterable && index === activeIndex}
            variant="menu-item"
            onClick={() => onSelect(opt.value)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-ui-subhead font-medium text-left text-ink-muted dark:text-stone hover:text-ink-light dark:hover:text-ink-dark hover:bg-paper-softgray dark:hover:bg-paper-dark-surface transition-colors border border-transparent hover:border-zinc-200/60 dark:hover:border-zinc-700/60 ${
              filterable && index === activeIndex ? "bg-paper-softgray dark:bg-paper-dark-surface text-ink-light dark:text-ink-dark" : ""
            }`}
          >
            <FolderIcon />
            {opt.label}
          </Button>
        ))}
        {shown.length === 0 && <p className="px-4 py-2 text-ui-footnote text-fg-muted">No matches</p>}
      </div>
    </div>
  );
}
