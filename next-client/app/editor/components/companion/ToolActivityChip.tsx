"use client";

import React, { useEffect, useState } from "react";
import { HiOutlineCheck, HiOutlineExclamation } from "react-icons/hi";
import type { ToolPartView } from "./companion-messages";
import { companionToolActivity } from "./tools/read-tools";

// Shows a spinner only for a tool that takes longer than this.
export const SPINNER_DELAY_MS = 300;

// One tool call in the companion thread, as a quiet line: what it did (the
// runner's activity line once it ran, else what it was asked), and whether
// it is running, done or failed. Shown the moment the call arrives; the
// spinner waits SPINNER_DELAY_MS so quick reads never flash it.
export default function ToolActivityChip({ view, activity }: { view: ToolPartView; activity?: string }) {
  const running = view.state === "running";
  const [showSpinner, setShowSpinner] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setShowSpinner(false);
    };
  }, [running]);

  const label = activity ?? companionToolActivity(view.toolName, view.input);
  return (
    <p
      className={`flex items-center gap-1.5 text-ui-caption ${view.state === "failed" ? "text-fg-muted" : "text-fg-faint"}`}
      data-state={view.state}
    >
      <span aria-hidden="true" className="flex w-3 shrink-0 justify-center">
        {running ? (
          showSpinner && <span className="h-2.5 w-2.5 animate-spin rounded-full border border-fg-faint border-t-transparent" />
        ) : view.state === "failed" ? (
          <HiOutlineExclamation size={12} />
        ) : (
          <HiOutlineCheck size={12} />
        )}
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {view.state === "failed" && <span className="sr-only">(failed)</span>}
    </p>
  );
}
