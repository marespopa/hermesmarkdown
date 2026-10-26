# PerfReadout

Description: Dev-only readout of what people feel: note open → text painted, keystroke → next paint, the open notes' storage write, app start → sidebar tree painted, and palette open → first paint. Each row shows the last value and the p75 of the last 50 samples; a footer counts long tasks over 50 ms (Chromium's `longtask` entries) and offers Reset. These numbers are the before/after for the perceived-performance work (`plans/002-perceived-performance`).

## Local State & Storage
- State: The samples live in `app/utils/perf/perf-metrics.ts` (module level), read with `useSyncExternalStore`.
- Persistence: `localStorage["perfReadout"]` (`atom_perfReadout`), toggled by the palette's **Toggle Performance Readout**. `?perf=1` shows it for one visit without storing anything.
- Production builds render nothing, register no command, and record no samples.

## Dependencies
- Core: React, Jotai, `useRegisterCommand`, `Button`.
- Zero-Cloud: No network; the measures are also `performance.measure` entries (`hermes:<name>`) for DevTools.

## Quick Usage
```tsx
import PerfReadout from "@/app/components/PerfReadout/PerfReadout";

<PerfReadout />
```

## Props Overview
None.
