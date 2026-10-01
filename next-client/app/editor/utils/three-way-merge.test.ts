// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  countMergeConflicts,
  resolveMergeConflicts,
  threeWayMerge,
} from "./three-way-merge";

describe("threeWayMerge", () => {
  it("combines non-overlapping edits without a conflict", () => {
    expect(
      threeWayMerge("one\ntwo\nthree\nfour", "one\ncurrent\nthree\nfour", "one\ntwo\nthree\nincoming"),
    ).toBe("one\ncurrent\nthree\nincoming");
  });

  it("marks overlapping edits and lets the user accept either side", () => {
    const merged = threeWayMerge("one\ntwo", "one\ncurrent", "one\nincoming");

    expect(countMergeConflicts(merged)).toBe(1);
    expect(resolveMergeConflicts(merged, "current")).toBe("one\ncurrent");
    expect(resolveMergeConflicts(merged, "incoming")).toBe("one\nincoming");
  });

  it("does not mark identical edits as a conflict", () => {
    expect(threeWayMerge("one\ntwo", "one\nupdated", "one\nupdated")).toBe("one\nupdated");
  });
});
