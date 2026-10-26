import { describe, expect, it } from "vitest";
import { ChangeSet } from "@codemirror/state";
import { addRange, coversAll, firstGap, mapRanges } from "./table-stages";

describe("table stages", () => {
  it("merges overlapping and touching stretches", () => {
    expect(addRange([{ from: 0, to: 10 }], { from: 11, to: 20 })).toEqual([{ from: 0, to: 20 }]);
    expect(addRange([{ from: 0, to: 10 }], { from: 30, to: 40 })).toEqual([{ from: 0, to: 10 }, { from: 30, to: 40 }]);
  });

  it("finds the first stretch not searched yet", () => {
    expect(firstGap([], 100)).toEqual({ from: 0, to: 100 });
    expect(firstGap([{ from: 0, to: 10 }, { from: 30, to: 100 }], 100)).toEqual({ from: 11, to: 30 });
    expect(firstGap([{ from: 0, to: 100 }], 100)).toBeNull();
  });

  it("knows when the whole note is covered", () => {
    expect(coversAll([{ from: 0, to: 100 }], 100)).toBe(true);
    expect(coversAll([{ from: 0, to: 50 }], 100)).toBe(false);
  });

  it("moves the stretches with an edit", () => {
    const changes = ChangeSet.of({ from: 0, insert: "abc" }, 100);
    expect(mapRanges([{ from: 10, to: 20 }], changes)).toEqual([{ from: 13, to: 23 }]);
  });
});
