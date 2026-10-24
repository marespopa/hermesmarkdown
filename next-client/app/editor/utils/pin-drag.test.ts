import { describe, expect, it, vi } from "vitest";
import { carriesPinTargets, PIN_DRAG_TYPE, readPinDragData, setPinDragData } from "./pin-drag";

const transfer = (data: Record<string, string> = {}) => ({
  types: Object.keys(data),
  setData: vi.fn((type: string, value: string) => {
    data[type] = value;
  }),
  getData: (type: string) => data[type] ?? "",
}) as unknown as DataTransfer & { setData: ReturnType<typeof vi.fn> };

describe("pin-drag", () => {
  it("carries notes and folders, leaving out other files and the vault root", () => {
    const dt = transfer();
    setPinDragData(dt, [
      { kind: "file", path: "projects/roadmap.md" },
      { kind: "folder", path: "projects" },
      { kind: "file", path: "assets/diagram.png" },
      { kind: "folder", path: "" },
    ]);
    expect(dt.setData).toHaveBeenCalledWith(PIN_DRAG_TYPE, JSON.stringify([
      { kind: "note", target: "projects/roadmap.md" },
      { kind: "folder", target: "projects" },
    ]));
  });

  it("adds no payload when nothing is pinnable", () => {
    const dt = transfer();
    setPinDragData(dt, [{ kind: "file", path: "assets/diagram.png" }]);
    expect(dt.setData).not.toHaveBeenCalled();
  });

  it("tells a pinnable drag by its type", () => {
    expect(carriesPinTargets(transfer({ [PIN_DRAG_TYPE]: "[]" }))).toBe(true);
    expect(carriesPinTargets(transfer({ Files: "" }))).toBe(false);
    expect(carriesPinTargets(null)).toBe(false);
  });

  it("reads the targets back, leaving out anything malformed", () => {
    const value = JSON.stringify([{ kind: "note", target: "roadmap.md" }, { kind: "tag", target: "release" }, { kind: "folder", target: "" }, null]);
    expect(readPinDragData(transfer({ [PIN_DRAG_TYPE]: value }))).toEqual([{ kind: "note", target: "roadmap.md" }]);
    expect(readPinDragData(transfer({ [PIN_DRAG_TYPE]: "{not json" }))).toEqual([]);
    expect(readPinDragData(transfer())).toEqual([]);
  });
});
