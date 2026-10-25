"use client";

import { useEffect, useState } from "react";
import { HiCheck, HiOutlineRefresh } from "react-icons/hi";
import { formatCount } from "@/app/components/CountBadge";
import type { ChangesProgress } from "@/app/services/git/git-changes-types";

// How far the running scan got, in words.
export function scanStatus(progress: ChangesProgress | null): string {
  if (!progress) return "Reading the repository…";
  if (progress.phase === "listing") return `Listing files… ${formatCount(progress.done)} found`;
  return `Checking ${formatCount(progress.done)} of ${formatCount(progress.total)} files…`;
}

interface Props {
  scanning: boolean;
  progress: ChangesProgress | null;
  /** A finished result is on screen (a scan's, or the saved one). */
  hasResult: boolean;
}

const SLOW_MS = 150;

// Whether the files on screen are all of them: "Checking N of M files…"
// with a spinner while a scan runs, "Up to date" with a check once it's
// done. Over a result, a scan shorter than 150ms keeps showing "Up to date"
// (a focus rescan doesn't flicker); with nothing finished yet the progress
// shows at once.
export default function ScanStatus({ scanning, progress, hasResult }: Props) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!scanning) return;
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [scanning]);

  const checking = scanning && (slow || !hasResult);
  if (!checking && !hasResult) return null;
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-ui-caption text-fg-muted">
      {checking ? (
        <>
          <HiOutlineRefresh aria-hidden="true" size={13} className="shrink-0 animate-spin motion-reduce:animate-none" />
          <span className="tabular-nums">{scanStatus(progress)}</span>
        </>
      ) : (
        <>
          <HiCheck aria-hidden="true" size={13} className="shrink-0 text-task-done" />
          Up to date
        </>
      )}
    </span>
  );
}
