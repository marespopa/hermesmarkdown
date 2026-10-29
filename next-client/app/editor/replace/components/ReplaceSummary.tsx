"use client";

import { useEffect, useState } from "react";
import { HiOutlineRefresh } from "react-icons/hi";
import Button from "@/app/components/Button";
import { formatCount } from "@/app/components/CountBadge";

const NOTE = "text-ui-footnote text-fg-muted";
const SLOW_MS = 150;

interface Props {
  /** The Find field has text. */
  searching: boolean;
  scanning: boolean;
  scanned: number;
  total: number;
  matchCount: number;
  fileCount: number;
  capped: boolean;
  invalid: boolean;
  stalled: boolean;
  hasPrivate: boolean;
  /** The last replace, offered for Undo until the next one. */
  banner: { matches: number; files: number } | null;
  onUndo: () => void;
  undoing: boolean;
}

// "Searching… N of M files", after 150 ms so a quick scan shows nothing.
function ScanStatus({ scanned, total }: { scanned: number; total: number }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!slow) return null;
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-ui-caption text-fg-muted">
      <HiOutlineRefresh aria-hidden="true" size={13} className="shrink-0 animate-spin motion-reduce:animate-none" />
      <span className="tabular-nums">Searching… {formatCount(scanned)} of {formatCount(total)} files</span>
    </span>
  );
}

// Above the previews: what was found, how far the scan got, why Replace is
// unavailable (too many matches, bad pattern, stalled pattern), the private
// notes note, and the banner with Undo after a replace.
export default function ReplaceSummary({ searching, scanning, scanned, total, matchCount, fileCount, capped, invalid, stalled, hasPrivate, banner, onUndo, undoing }: Props) {
  let message: string | null = null;
  if (!searching) message = "Type what to find.";
  else if (invalid) message = "Not a valid regular expression yet.";
  else if (stalled) message = "Search stopped: this pattern takes too long. Try a simpler one.";
  else if (capped) message = "More than 5,000 matches. Narrow the search to replace.";

  return (
    <div className="space-y-2">
      {banner && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-edge-subtle bg-fill px-3 py-2" role="status">
          <p className="min-w-0 flex-1 text-ui-footnote text-fg">
            Replaced {formatCount(banner.matches, ["match", "matches"])} in {formatCount(banner.files, ["file", "files"])}
          </p>
          <Button variant="secondary" onClick={onUndo} isDisabled={undoing} className="shrink-0">Undo</Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {searching && !invalid && !stalled && (
          <p className={NOTE}>
            {formatCount(matchCount, ["match", "matches"])} in {formatCount(fileCount, ["file", "files"])}
          </p>
        )}
        {scanning && searching && <ScanStatus scanned={scanned} total={total} />}
      </div>
      {message && <p className={NOTE}>{message}</p>}
      {hasPrivate && <p className="text-ui-caption text-fg-faint">Private files are skipped.</p>}
    </div>
  );
}
