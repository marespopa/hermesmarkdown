import { atomWithStorage } from "jotai/utils";

// The dev-only performance readout (PerfReadout): on from the palette's
// Toggle Performance Readout, or for one visit with `?perf=1`. Production
// builds never show it, whatever is stored.
export const atom_perfReadout = atomWithStorage<boolean>("perfReadout", false);
