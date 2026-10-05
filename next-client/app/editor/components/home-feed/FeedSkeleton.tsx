"use client";

import React from "react";

// Placeholder rows, laid out like FeedRow, until the vault's notes are
// listed.
export default function FeedSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" data-testid="feed-skeleton" className="-mx-3 flex flex-col motion-safe:animate-pulse">
      <span className="mx-3 mb-2.5 mt-1 block h-3 w-16 rounded bg-surface-raised" />
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} data-skeleton-row className="block px-3 py-2.5">
          <span className="block h-3.5 w-1/2 rounded bg-surface-raised" />
          <span className="mt-2.5 block space-y-2">
            <span className="block h-2.5 w-11/12 rounded bg-surface-raised" />
            <span className="block h-2.5 w-2/3 rounded bg-surface-raised" />
          </span>
        </span>
      ))}
    </div>
  );
}
