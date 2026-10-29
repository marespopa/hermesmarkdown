// Dev-only measures of what people feel (PerfReadout shows them): note open
// → text painted, keystroke → next paint, the open notes' storage write, app
// start → sidebar tree painted, palette open → first paint, plus long tasks.
// Each one is a `performance.measure`, so DevTools' Performance panel shows
// them too. Production builds record nothing: every call returns at once.

export type PerfMeasure = "note-open" | "keystroke" | "notes-persist" | "sidebar-tree" | "palette-open";

export const PERF_MEASURES: { name: PerfMeasure; label: string }[] = [
  { name: "note-open", label: "Open → text" },
  { name: "keystroke", label: "Key → paint" },
  { name: "notes-persist", label: "Files write" },
  { name: "sidebar-tree", label: "Start → tree" },
  { name: "palette-open", label: "Palette → paint" },
];

// Tasks over this (ms) are long: the browser's own threshold.
export const LONG_TASK_MS = 50;
// Samples kept per measure for its p75.
const SAMPLES = 50;

export interface PerfStat {
  last: number;
  p75: number;
  count: number;
}

export interface PerfSnapshot {
  measures: Partial<Record<PerfMeasure, PerfStat>>;
  longTasks: { count: number; last: number | null };
}

const enabled = () => process.env.NODE_ENV !== "production" && typeof performance !== "undefined";

const samples = new Map<PerfMeasure, number[]>();
let longTaskCount = 0;
let lastLongTask: number | null = null;
const listeners = new Set<() => void>();
let snapshot: PerfSnapshot = { measures: {}, longTasks: { count: 0, last: null } };

function emit() {
  const measures: PerfSnapshot["measures"] = {};
  for (const [name, values] of samples) {
    const sorted = [...values].sort((a, b) => a - b);
    measures[name] = { last: values[values.length - 1], p75: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))], count: values.length };
  }
  snapshot = { measures, longTasks: { count: longTaskCount, last: lastLongTask } };
  for (const listener of listeners) listener();
}

/** Records one sample of `name`, from `start` (a performance.now() time) to now. */
export function recordPerf(name: PerfMeasure, start: number, end = performance.now()): void {
  if (!enabled()) return;
  try {
    performance.measure(`hermes:${name}`, { start, end });
  } catch {
    // Older browsers without measure options: the readout still has it.
  }
  const values = samples.get(name) ?? [];
  values.push(end - start);
  if (values.length > SAMPLES) values.shift();
  samples.set(name, values);
  emit();
}

/** Records `name` from `start` until the frame after the next paint. */
export function recordPerfAfterPaint(name: PerfMeasure, start: number): void {
  if (!enabled() || typeof requestAnimationFrame === "undefined") return;
  // rAF runs just before the paint; a task queued from it runs after it.
  requestAnimationFrame(() => setTimeout(() => recordPerf(name, start), 0));
}

/** Times `work` (synchronous) as one sample of `name`. */
export function timePerf<T>(name: PerfMeasure, work: () => T): T {
  if (!enabled()) return work();
  const start = performance.now();
  try {
    return work();
  } finally {
    recordPerf(name, start);
  }
}

// Measures that start in one place and end in another (palette open).
const starts = new Map<PerfMeasure, number>();

/** Marks the start of `name`; finishPerfAfterPaint ends it. */
export function startPerf(name: PerfMeasure): void {
  if (enabled()) starts.set(name, performance.now());
}

/** Ends `name` after the next paint, if startPerf began it. */
export function finishPerfAfterPaint(name: PerfMeasure): void {
  const start = starts.get(name);
  if (start === undefined) return;
  starts.delete(name);
  recordPerfAfterPaint(name, start);
}

let sidebarRecorded = false;
/** App start → the sidebar's file tree first painted with rows; once per page load. */
export function recordSidebarTreePainted(): void {
  if (sidebarRecorded || !enabled()) return;
  sidebarRecorded = true;
  recordPerfAfterPaint("sidebar-tree", 0);
}

let observingLongTasks = false;
function observeLongTasks() {
  if (observingLongTasks || typeof PerformanceObserver === "undefined") return;
  observingLongTasks = true;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration <= LONG_TASK_MS) continue;
        longTaskCount++;
        lastLongTask = entry.duration;
      }
      emit();
    }).observe({ type: "longtask", buffered: true });
  } catch {
    // No long-task entries outside Chromium.
  }
}

export function subscribePerf(listener: () => void): () => void {
  if (enabled()) observeLongTasks();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getPerfSnapshot = (): PerfSnapshot => snapshot;

/** Clears every sample (the readout's Reset). */
export function resetPerf(): void {
  samples.clear();
  longTaskCount = 0;
  lastLongTask = null;
  emit();
}
