import React, { useState } from 'react'
import Badge from "@/app/components/Badges/Badge";

type Props = {
  tags: string[];
  maxVisible: number;
}

export default function TemplateTags({ tags, maxVisible = 3 }: Props) {
  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visibleTags.map((tag, index) => (
        <Badge key={index} label={tag} variant="standard" />
      ))}
      {remainingCount > 0 && (
        <Badge label={`+${remainingCount} more`} variant="standard" />
      )}
    </div>
  );
}
