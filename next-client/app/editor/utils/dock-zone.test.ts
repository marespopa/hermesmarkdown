import { describe, it, expect } from "vitest";
import { dockPreviewRect, dockZoneAt } from "./dock-zone";

const rect = { left: 0, top: 0, width: 400, height: 300 };

describe("dockZoneAt", () => {
  it("picks each edge", () => {
    expect(dockZoneAt(rect, 10, 150)).toBe("left");
    expect(dockZoneAt(rect, 390, 150)).toBe("right");
    expect(dockZoneAt(rect, 200, 10)).toBe("top");
    expect(dockZoneAt(rect, 200, 290)).toBe("bottom");
  });

  it("is center away from the edges", () => {
    expect(dockZoneAt(rect, 200, 150)).toBe("center");
  });

  it("caps the band at 96px on a large pane", () => {
    const big = { left: 0, top: 0, width: 2000, height: 1500 };
    expect(dockZoneAt(big, 95, 750)).toBe("left");
    expect(dockZoneAt(big, 97, 750)).toBe("center");
  });

  it("takes the nearest edge in a corner", () => {
    expect(dockZoneAt(rect, 20, 5)).toBe("top");
    expect(dockZoneAt(rect, 5, 20)).toBe("left");
  });

  it("respects the rect's offset", () => {
    expect(dockZoneAt({ ...rect, left: 500, top: 100 }, 510, 250)).toBe("left");
  });
});

describe("dockPreviewRect", () => {
  it("covers a half for an edge and everything for center", () => {
    expect(dockPreviewRect("left")).toMatchObject({ left: "0%", width: "50%", height: "100%" });
    expect(dockPreviewRect("bottom")).toMatchObject({ top: "50%", width: "100%", height: "50%" });
    expect(dockPreviewRect("center")).toMatchObject({ width: "100%", height: "100%" });
  });
});
