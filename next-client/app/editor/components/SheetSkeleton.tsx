"use client";

import React, { useEffect, useState } from "react";

// Same placeholder shape as EditorSkeleton's: static black / white so the
// opacity modifier works, pulsing only when motion is allowed.
const BAR = "bg-black/[0.06] dark:bg-white/[0.08] motion-safe:animate-pulse";

// Opens faster than this show no skeleton at all, so a quick switch doesn't flash.
export const SHEET_SKELETON_DELAY_MS = 150;

// A rollup sheet's outline: a title, its summary line, then headed sections
// of task lines (box and text), as a share of the column.
const SECTIONS = [
  { heading: "w-24", lines: ["78%", "64%", "86%", "52%"] },
  { heading: "w-16", lines: ["70%", "58%", "81%"] },
  { heading: "w-28", lines: ["66%", "74%"] },
];

// Covers the text column while the sheet switcher opens another sheet
// (a rollup is built from every daily sheet in its period, which can take a
// moment), after a short delay. Sits over the editor in its own column, on
// the same paper, so the new sheet replaces it in place.
export default function SheetSkeleton({ delay = SHEET_SKELETON_DELAY_MS }: { delay?: number }) {
  const [visible, setVisible] = useState(delay <= 0);
  useEffect(() => {
    if (delay <= 0) return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  if (!visible) return null;

  return (
    <div role="status" aria-label="Opening sheet" className="absolute inset-0 z-10 flex flex-col pt-1 select-none">
      <span className="sr-only">Opening sheet…</span>
      <div aria-hidden="true" className="flex flex-col">
        <div className={`h-7 w-2/5 rounded-lg mb-4 ${BAR}`} />
        <div className={`h-3 w-3/5 rounded-full mb-10 ${BAR}`} />
        {SECTIONS.map((section, s) => (
          <div key={s} className="flex flex-col gap-3 mb-9">
            <div className={`h-4 ${section.heading} rounded-md mb-1 ${BAR}`} />
            {section.lines.map((width, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className={`h-3.5 w-3.5 shrink-0 rounded ${BAR}`} />
                <div style={{ width }} className={`h-3.5 rounded-full ${BAR}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
