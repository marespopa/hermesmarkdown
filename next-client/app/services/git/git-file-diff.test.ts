import { describe, expect, it } from "vitest";
import { buildFileDiff, classifyBytes } from "./git-file-diff";

describe("buildFileDiff", () => {
  it("describes a modified file", () => {
    expect(buildFileDiff("a\nb\nc\nd", "a\nX\nY\nc\nd")).toEqual({
      kind: "text",
      lines: ["a", "X", "Y", "c", "d"],
      changes: [{ oldStart: 2, removed: ["b"], newStart: 2, newCount: 2 }],
    });
  });

  it("describes an added file", () => {
    expect(buildFileDiff(null, "a\nb")).toEqual({ kind: "text", lines: ["a", "b"], changes: [{ oldStart: 0, removed: [], newStart: 1, newCount: 2 }] });
  });

  it("describes a deleted file with no new lines", () => {
    expect(buildFileDiff("a\nb", null)).toEqual({ kind: "text", lines: [], changes: [{ oldStart: 1, removed: ["a", "b"], newStart: 1, newCount: 0 }] });
  });

  it("gives an empty added file zero lines and no changes", () => {
    expect(buildFileDiff(null, "")).toEqual({ kind: "text", lines: [], changes: [] });
  });

  it("finds no change when only the line endings differ", () => {
    expect(buildFileDiff("a\r\nb\r\n", "a\nb\n").changes).toEqual([]);
  });

  it("handles a file emptied or filled in place", () => {
    expect(buildFileDiff("a", "").changes).toEqual([{ oldStart: 1, removed: ["a"], newStart: 1, newCount: 0 }]);
    expect(buildFileDiff("", "a").changes).toEqual([{ oldStart: 0, removed: [], newStart: 1, newCount: 1 }]);
  });
});

describe("classifyBytes", () => {
  it("flags a NUL as binary", () => {
    expect(classifyBytes(Uint8Array.from([97, 0, 98]))).toBe("binary");
  });

  it("flags more than 2 MB as too large", () => {
    expect(classifyBytes(new Uint8Array(2 * 1024 * 1024 + 1).fill(97))).toBe("too-large");
  });

  it("accepts plain text", () => {
    expect(classifyBytes(new TextEncoder().encode("hi"))).toBe("ok");
  });
});
