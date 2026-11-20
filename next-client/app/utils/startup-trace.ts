// Breadcrumbs for opening the editor: each step of restoring the vault and
// the open notes marks itself here, with the time since page load. If the
// editor ever stays on its skeleton, the watchdog (VaultAccessGate) logs the
// trail, and `sessionStorage["hm-startup-trace"]` keeps it for the console,
// so a stuck start shows which step it stopped at.

export const STARTUP_TRACE_KEY = "hm-startup-trace";
const MAX_ENTRIES = 50;

export interface StartupMark {
  phase: string;
  /** Milliseconds since the page loaded. */
  t: number;
}

let marks: StartupMark[] = [];

export function markStartup(phase: string): void {
  const t = typeof performance !== "undefined" ? Math.round(performance.now()) : 0;
  marks = [...marks, { phase, t }].slice(-MAX_ENTRIES);
  try {
    sessionStorage.setItem(STARTUP_TRACE_KEY, JSON.stringify(marks));
  } catch {
    // Storage blocked or full: the trail stays in memory.
  }
}

export const getStartupTrace = (): readonly StartupMark[] => marks;

/** Test helper. */
export function resetStartupTrace(): void {
  marks = [];
}
