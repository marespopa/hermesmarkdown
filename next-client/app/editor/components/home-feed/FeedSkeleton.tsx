"use client";

import React from "react";

const BAR = "block rounded bg-surface-raised";

// One placeholder bar, centered in a line box of the real text's height, so
// the outline takes the same room as the text it stands in for.
function Line({ lineClass, barClass }: { lineClass: string; barClass: string }) {
  return (
    <span className={`flex items-center ${lineClass}`}>
      <span className={`${BAR} ${barClass}`} />
    </span>
  );
}

// The vault bar at the top of the feed (FeedVault): icon, name, where it lives.
export function FeedVaultSkeleton() {
  return (
    <div aria-hidden="true" data-testid="feed-vault-skeleton" className="flex min-h-[3.25rem] items-center gap-2 border-b border-edge-subtle py-1.5 motion-safe:animate-pulse">
      <span className={`${BAR} h-3.5 w-3.5`} />
      <span className={`${BAR} h-2.5 w-24`} />
      <span className={`${BAR} hidden h-2.5 w-16 sm:block`} />
    </div>
  );
}

// The week strip under the header (WeekStrip): seven days of weekday
// initial, date and note dot.
export function WeekStripSkeleton() {
  return (
    <div aria-hidden="true" data-testid="week-strip-skeleton" className="mt-6 grid grid-cols-7 gap-1 motion-safe:animate-pulse">
      {Array.from({ length: 7 }, (_, index) => (
        <span key={index} className="flex flex-col items-center gap-1 py-2">
          <Line lineClass="h-4" barClass="h-2 w-2.5" />
          <Line lineClass="h-[1.3125rem]" barClass="h-3 w-4" />
          <span className="h-1 w-1" />
        </span>
      ))}
    </div>
  );
}

// Placeholder rows, laid out like FeedRow (gutter label, title, two preview
// lines, file name), until the vault's notes are listed.
export default function FeedSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" data-testid="feed-skeleton" className="flex flex-col gap-1 motion-safe:animate-pulse">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} data-skeleton-row className="grid grid-cols-[4.5rem_1fr] gap-3 sm:grid-cols-[5rem_1fr]">
          <span className="flex justify-end pt-4">
            <Line lineClass="h-[1.125rem]" barClass="h-2.5 w-10" />
          </span>
          <span className="block py-3 pl-3 pr-10 [@media(hover:none)]:pr-3">
            <Line lineClass="h-[1.375rem]" barClass="h-3.5 w-1/2" />
            <span className="mt-1 block">
              <Line lineClass="h-[1.625rem]" barClass="h-2.5 w-11/12" />
              <Line lineClass="h-[1.625rem]" barClass="h-2.5 w-2/3" />
            </span>
            <Line lineClass="mt-1.5 h-4" barClass="h-2 w-1/4" />
          </span>
        </div>
      ))}
    </div>
  );
}
