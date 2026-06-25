"use client";

import React from "react";
import type { FormulaBadge } from "../hooks/use-formula-overlay";

interface FormulaResultOverlayProps {
  badges: FormulaBadge[];
}

const JUSTIFY_CLASS = { left: "justify-start", center: "justify-center", right: "justify-end" } as const;

// Opaque badges drawn over each formula cell's raw `=SUM(...)` text in the
// textarea, showing the live computed value instead. `pointer-events-none`
// so clicks fall through to the real textarea underneath — clicking a
// formula cell still places the caret there normally, which is what makes
// that cell's badge disappear (see useFormulaOverlay) and reveals the raw
// formula for editing.
export function FormulaResultOverlay({ badges }: FormulaResultOverlayProps) {
  if (badges.length === 0) return null;

  return (
    <>
      {badges.map((b) => (
        <div
          key={b.key}
          style={{ top: b.top, left: b.left, width: b.width, height: b.height }}
          className={`
            absolute z-30 pointer-events-none flex items-center px-0.5
            font-mono text-ui-footnote tabular-nums rounded-sm
            bg-paper-light dark:bg-paper-dark
            ${JUSTIFY_CLASS[b.alignment]}
            ${b.isError ? "text-red-600 dark:text-red-400" : "text-ink-light dark:text-ink-dark"}
          `}
        >
          {b.text}
        </div>
      ))}
    </>
  );
}
