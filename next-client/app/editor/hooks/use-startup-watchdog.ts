"use client";

import { useEffect } from "react";
import { showActionToast } from "@/app/components/Toastr";
import { getStartupTrace } from "@/app/utils/startup-trace";

// How long the editor may stay on its skeleton before saying so.
export const STARTUP_STUCK_MS = 10_000;

// A safety net for the editor's skeleton: the storage steps behind it have
// their own timeouts, but if one still never ends, the page would sit there
// with nothing to read or do. After STARTUP_STUCK_MS of `waiting` it offers a
// reload once, and logs the steps reached (startup-trace.ts) for the console.
// It only adds a toast: it never changes the state it watches.
export function useStartupWatchdog(waiting: boolean): void {
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      console.warn("The editor is still opening after", STARTUP_STUCK_MS, "ms. Steps reached:", [...getStartupTrace()]);
      showActionToast("Still opening your notes…", "Reload", () => window.location.reload());
    }, STARTUP_STUCK_MS);
    return () => clearTimeout(timer);
  }, [waiting]);
}
