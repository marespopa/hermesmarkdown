"use client";

import React from "react";

const ROWS = 3;

// Placeholder rows, laid out like FeedRow, until the vault's notes are
// listed.
export default function FeedSkeleton() {
  return (
    <div aria-hidden="true" data-testid="feed-skeleton" className="flex flex-col gap-1 motion-safe:animate-pulse">
      {Array.from({ length: ROWS }, (_, index) => (
        <div key={index} className="grid grid-cols-[4.5rem_1fr] gap-3 sm:grid-cols-[5rem_1fr]">
          <span className="mt-5 ml-auto block h-2.5 w-10 rounded bg-surface-raised" />
          <span className="block px-3 py-3">
            <span className="block h-3.5 w-1/2 rounded bg-surface-raised" />
            <span className="mt-3 block space-y-2">
              <span className="block h-2.5 w-11/12 rounded bg-surface-raised" />
              <span className="block h-2.5 w-2/3 rounded bg-surface-raised" />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
