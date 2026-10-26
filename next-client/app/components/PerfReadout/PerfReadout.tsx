"use client";

import { useSyncExternalStore } from "react";
import { useAtom } from "jotai";
import { atom_perfReadout } from "@/app/atoms/perf-atoms";
import { useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";
import Button from "@/app/components/Button";
import { getPerfSnapshot, LONG_TASK_MS, PERF_MEASURES, resetPerf, subscribePerf, type PerfSnapshot } from "@/app/utils/perf/perf-metrics";

const IS_DEV = process.env.NODE_ENV !== "production";
const EMPTY: PerfSnapshot = { measures: {}, longTasks: { count: 0, last: null } };

const queryFlag = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perf") === "1";
const ms = (value: number) => `${value < 10 ? value.toFixed(1) : Math.round(value)} ms`;

// Dev-only readout of the perceived-performance measures (perf-metrics.ts):
// the last value and p75 of each, and the long tasks (over 50 ms) seen.
// Toggled from the palette or `?perf=1`; production builds render nothing
// and register no command.
export default function PerfReadout() {
  if (!IS_DEV) return null;
  return <DevPerfReadout />;
}

function DevPerfReadout() {
  const [stored, setStored] = useAtom(atom_perfReadout);
  useRegisterCommand({
    id: "toggle-perf-readout",
    label: "Toggle Performance Readout",
    description: "Dev only: open, typing and storage timings",
    category: "Views",
    keywords: "performance perf timing measure fps latency dev debug",
    action: () => setStored((on) => !on),
  });
  const visible = stored || queryFlag();
  const snapshot = useSyncExternalStore(subscribePerf, getPerfSnapshot, () => EMPTY);
  if (!visible) return null;
  const { count, last } = snapshot.longTasks;
  return (
    <div role="status" aria-label="Performance readout" className="fixed bottom-2 left-2 z-50 rounded-md border border-edge bg-overlay px-2 py-1.5 text-xs text-fg-muted font-mono tabular-nums shadow-sm">
      <table>
        <thead>
          <tr><th className="pr-3 text-left font-normal">Measure</th><th className="pr-3 text-right font-normal">Last</th><th className="text-right font-normal">p75</th></tr>
        </thead>
        <tbody>
          {PERF_MEASURES.map(({ name, label }) => {
            const stat = snapshot.measures[name];
            return (
              <tr key={name}>
                <td className="pr-3">{label}</td>
                <td className="pr-3 text-right">{stat ? ms(stat.last) : "–"}</td>
                <td className="text-right">{stat ? ms(stat.p75) : "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className={`mt-1 flex items-center justify-between gap-2 ${count > 0 ? "text-danger" : ""}`}>
        <span>Long tasks &gt;{LONG_TASK_MS} ms: {count}{last !== null ? ` (last ${ms(last)})` : ""}</span>
        <Button variant="secondary" label="Reset performance readout" onClick={resetPerf}>Reset</Button>
      </div>
    </div>
  );
}
