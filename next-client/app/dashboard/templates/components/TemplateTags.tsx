import React, { useState } from 'react'

type Props = {
    tags: string[];
    maxVisible: number;
}


export default function TemplateTags({tags, maxVisible = 3}: Props) {
    const [showAllTags, setShowAllTags] = useState(false);
    const visibleTags = showAllTags ? tags: tags.slice(0, maxVisible);
    const remainingCount = showAllTags ? 0 :tags.length - maxVisible;

    return (
      <div className="flex flex-wrap gap-1">
        {visibleTags.map((tag, index) => renderTag(tag, index))}
        {remainingCount > 0 && (
          <span className="text-xs text-gray-500" onClick={() => setShowAllTags(!showAllTags)}>+{remainingCount} more</span>
        )}
      </div>
    );


  function renderTag(tag: string, index: number) {
    return (
      <span
        key={index}
        className="bg-amber-100 text-amber-800 text-xs px-2 py-[0.125rem] rounded"
      >
        {tag}
      </span>
    );
  }
  }
