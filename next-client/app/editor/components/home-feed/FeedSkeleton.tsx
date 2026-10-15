"use client";

import React from "react";

const BAR = "block rounded bg-surface-raised";

// One placeholder bar in a line box set in the real text's type (a
// non-breaking space gives it that height), so the outline takes exactly the
// room of the text it stands in for.
export function SkeletonLine({ textClass, barClass }: { textClass: string; barClass: string }) {
  return (
    <span className={`relative block ${textClass}`}>
      {" "}
      <span className="absolute inset-0 flex items-center">
        <span className={`${BAR} ${barClass}`} />
      </span>
    </span>
  );
}

// The two preview lines under a row's title (FeedRow's preview type), shared
// by the skeleton rows and a listed note the indexer hasn't read yet.
export function FeedPreviewSkeleton() {
  return (
    <span aria-hidden="true" className="mt-1 block motion-safe:animate-pulse">
      <SkeletonLine textClass="text-ui-subhead leading-relaxed" barClass="h-2.5 w-11/12" />
      <SkeletonLine textClass="text-ui-subhead leading-relaxed" barClass="h-2.5 w-2/3" />
    </span>
  );
}

// The vault bar at the top of the feed (FeedVault): icon, name, where it lives.
export function FeedVaultSkeleton() {
  return (
    <div aria-hidden="true" data-testid="feed-vault-skeleton" className="flex items-center gap-1.5 border-b border-edge-subtle py-1.5 motion-safe:animate-pulse">
      <span className={`${BAR} h-3.5 w-3.5`} />
      <span className="flex min-h-[2.5rem] items-center">
        <span className={`${BAR} h-2.5 w-24`} />
      </span>
      <span className={`${BAR} hidden h-2.5 w-16 sm:block`} />
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
            <SkeletonLine textClass="text-ui-footnote" barClass="h-2.5 w-10" />
          </span>
          <span className="block py-3 pl-3 pr-12">
            <SkeletonLine textClass="text-ui-body" barClass="h-3.5 w-1/2" />
            <FeedPreviewSkeleton />
            <span className="mt-1.5 block">
              <SkeletonLine textClass="text-ui-caption" barClass="h-2 w-1/4" />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
