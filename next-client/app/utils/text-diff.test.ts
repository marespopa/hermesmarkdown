// @vitest-environment node
import { describe, expect, it } from "vitest";
import { changedRange } from "./text-diff";

const apply = (prev: string, change: { from: number; to: number; insert: string }) =>
  prev.slice(0, change.from) + change.insert + prev.slice(change.to);

describe("changedRange", () => {
  it("is an insertion at the end for an append", () => {
    expect(changedRange("# Day\n", "# Day\n- a\n")).toEqual({ from: 6, to: 6, insert: "- a\n" });
  });

  it("covers only the edited middle", () => {
    const prev = "one two three";
    const next = "one 2 three";
    const change = changedRange(prev, next)!;
    expect(change).toEqual({ from: 4, to: 7, insert: "2" });
    expect(apply(prev, change)).toBe(next);
  });

  it("returns null for identical strings", () => {
    expect(changedRange("same", "same")).toBeNull();
  });

  it("replaces everything when nothing is shared", () => {
    expect(changedRange("abc", "xyz")).toEqual({ from: 0, to: 3, insert: "xyz" });
  });

  it("doesn't let prefix and suffix overlap on repeated text", () => {
    const prev = "aaa";
    const next = "aaaa";
    const change = changedRange(prev, next)!;
    expect(apply(prev, change)).toBe(next);
    expect(change.to).toBeGreaterThanOrEqual(change.from);
  });
});
