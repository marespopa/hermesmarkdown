"use client";

import React, { useEffect, useState } from "react";

// Shown in turn while the vault indexes, one every ROTATE_MS.
export const INDEXING_VERBS = [
  "Indexing",
  "Gathering",
  "Reading",
  "Sorting",
  "Sifting",
  "Cataloguing",
  "Threading",
  "Collating",
  "Unfolding",
  "Tidying",
];
export const ROTATE_MS = 900;

// Shared across mounts: indexing runs are often shorter than ROTATE_MS, so
// each run starts on the verb after the last one shown instead of always
// on "Indexing".
let cursor = 0;

// Status line above the feed while the indexer runs. The visible verb
// rotates; screen readers get one stable "Indexing notes" instead.
export default function FeedStatus() {
  const [index, setIndex] = useState(() => cursor);

  useEffect(() => {
    cursor = (cursor + 1) % INDEXING_VERBS.length;
    const id = window.setInterval(() => {
      setIndex(cursor);
      cursor = (cursor + 1) % INDEXING_VERBS.length;
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p role="status" aria-label="Indexing notes" className="-mt-4 pb-4 text-ui-caption text-fg-muted">
      <span aria-hidden="true">{INDEXING_VERBS[index]} notes…</span>
    </p>
  );
}
