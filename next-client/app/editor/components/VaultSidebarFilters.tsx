"use client";

import React from "react";
import SidebarHeader from "./SidebarHeader";

interface VaultSidebarFiltersProps {
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  tags: string[];
  isTagsExpanded: boolean;
  setIsTagsExpanded: (expanded: boolean) => void;
  tagSearchQuery: string;
  setTagSearchQuery: (query: string) => void;
  processedTags: string[];
}

export default function VaultSidebarFilters({
  selectedTag,
  setSelectedTag,
  tags,
  isTagsExpanded,
  setIsTagsExpanded,
  tagSearchQuery,
  setTagSearchQuery,
  processedTags,
}: VaultSidebarFiltersProps) {
  if (selectedTag || tags.length === 0) return null;

  return (
    <div className="space-y-1">
      <SidebarHeader
        title="Smart Filters"
        isExpanded={isTagsExpanded}
        onToggle={() => setIsTagsExpanded(!isTagsExpanded)}
      />
      
      {isTagsExpanded && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {tags.length > 5 && (
            <div className="px-1 mb-2">
              <div className="relative group/search">
                <input
                  type="text"
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  placeholder="Search filters..."
                  className="w-full bg-zinc-200/40 dark:bg-zinc-800/40 border-none rounded-xl px-3 py-2 text-ui-caption outline-none focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-zinc-400 font-medium"
                />
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 px-2 max-h-48 overflow-y-auto overscroll-none custom-scrollbar">
            {processedTags.map((tag) => (
              <span
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className="text-ui-footnote font-bold px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-blue-500/20 transition-all border border-blue-500/20 active:scale-95"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}

            {tagSearchQuery && processedTags.length === 0 && (
              <div className="w-full py-4 text-center opacity-30 text-ui-footnote font-medium italic">
                No filters found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
