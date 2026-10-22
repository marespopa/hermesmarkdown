import type { DockZone } from "@/app/types/workspace";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const BAND_FRACTION = 0.25;
const BAND_MAX_PX = 96;

// The drop zone under the pointer: each edge is a band of the outer 25% of
// that axis (at most 96px); the nearest edge inside its band wins, the rest
// is the center.
export function dockZoneAt(rect: Rect, x: number, y: number): DockZone {
  const bandX = Math.min(rect.width * BAND_FRACTION, BAND_MAX_PX);
  const bandY = Math.min(rect.height * BAND_FRACTION, BAND_MAX_PX);
  const edges: { zone: DockZone; distance: number; band: number }[] = [
    { zone: "left", distance: x - rect.left, band: bandX },
    { zone: "right", distance: rect.left + rect.width - x, band: bandX },
    { zone: "top", distance: y - rect.top, band: bandY },
    { zone: "bottom", distance: rect.top + rect.height - y, band: bandY },
  ];
  const inside = edges.filter((e) => e.distance < e.band);
  if (inside.length === 0) return "center";
  inside.sort((a, b) => a.distance - b.distance);
  return inside[0].zone;
}

// Where the dropped note will land, as a CSS percentage box over the pane:
// the matching half for an edge, the whole pane for the center.
export function dockPreviewRect(zone: DockZone): { top: string; left: string; width: string; height: string } {
  switch (zone) {
    case "left": return { top: "0%", left: "0%", width: "50%", height: "100%" };
    case "right": return { top: "0%", left: "50%", width: "50%", height: "100%" };
    case "top": return { top: "0%", left: "0%", width: "100%", height: "50%" };
    case "bottom": return { top: "50%", left: "0%", width: "100%", height: "50%" };
    default: return { top: "0%", left: "0%", width: "100%", height: "100%" };
  }
}
