"use client";

import React, { useMemo, useRef, useState } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { useVirtualizer } from "@tanstack/react-virtual";

// Matches the threshold used by VaultSidebarFiles — below it, plain
// rendering is simpler; above it, one DOM node per tag becomes the
// actual performance cliff for vaults with very large tag vocabularies.
const VIRTUALIZE_THRESHOLD = 200;
const ROW_HEIGHT = 36;

interface VaultSidebarTagsProps {
  tags: string[];
  tagCounts: Record<string, number>;
  selectedTags: string[];
  onSelectTag: (tag: string) => void;
}

export default function VaultSidebarTags({ tags, tagCounts, selectedTags, onSelectTag }: VaultSidebarTagsProps) {
  const [filter, setFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredTags = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((tag) => tag.toLowerCase().includes(q));
  }, [tags, filter]);

  const shouldVirtualize = filteredTags.length > VIRTUALIZE_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: filteredTags.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const renderRow = (tag: string) => {
    const isActive = selectedTags.includes(tag);
    return (
      <button
        key={tag}
        onClick={() => onSelectTag(tag)}
        className={`flex w-full items-center justify-between px-4 py-2 text-ui-subhead relative ${
          isActive
            ? "text-accent font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:bg-accent"
            : "text-ink-muted hover:text-ink-light dark:text-stone dark:hover:text-ink-dark"
        }`}
      >
        <span className="truncate">#{tag}</span>
        <span className="text-ui-caption text-fg-faint">{tagCounts[tag] ?? 0}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {tags.length > 0 && (
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div
            className={[
              "flex items-center h-9 px-3 gap-2 cursor-text",
              "rounded-xl",
              "bg-paper-light dark:bg-paper-dark",
              "border border-edge",
              "focus-within:ring-2 focus-within:ring-sage/20",
              "transition-all duration-150",
            ].join(" ")}
            onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}
          >
            <HiOutlineSearch size={15} className="shrink-0 text-stone" aria-hidden />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tags…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Filter tags"
              className={[
                "flex-1 min-w-0 bg-transparent outline-none focus-visible:outline-none border-none",
                "text-[13px] sm:text-xs leading-none",
                "text-ink-light dark:text-ink-dark",
                "placeholder:text-stone dark:placeholder:text-stone",
                "caret-sage",
              ].join(" ")}
            />
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar py-1 min-h-0">
        {tags.length === 0 ? (
          <p className="px-4 py-3 text-ui-footnote text-stone dark:text-fg-faint">No tags in this vault yet.</p>
        ) : filteredTags.length === 0 ? (
          <p className="px-4 py-3 text-ui-footnote text-stone dark:text-fg-faint">No tags match &ldquo;{filter}&rdquo;.</p>
        ) : shouldVirtualize ? (
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: ROW_HEIGHT,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderRow(filteredTags[virtualRow.index])}
              </div>
            ))}
          </div>
        ) : (
          filteredTags.map((tag) => renderRow(tag))
        )}
      </div>
    </div>
  );
}
