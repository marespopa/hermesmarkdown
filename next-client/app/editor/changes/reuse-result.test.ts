import { describe, expect, it } from "vitest";
import type { ChangedFile, ChangesResult } from "@/app/services/git/git-changes-types";
import { reuseUnchanged } from "./reuse-result";

const file = (path: string, lines: string[]): ChangedFile => ({
  path,
  status: "modified",
  added: 1,
  removed: 1,
  diff: { kind: "text", changes: [{ oldStart: 1, removed: ["old"], newStart: 1, newCount: 1 }], lines },
});
const ok = (files: ChangedFile[], commit = "c"): ChangesResult => ({ status: "ok", commit, files });

describe("reuseUnchanged", () => {
  it("returns the previous result when nothing changed", () => {
    const previous = ok([file("a.md", ["x"]), file("b.md", ["y"])]);
    expect(reuseUnchanged(previous, ok([file("a.md", ["x"]), file("b.md", ["y"])]))).toBe(previous);
  });

  it("keeps the unchanged files' objects and takes the changed ones", () => {
    const previous = ok([file("a.md", ["x"]), file("b.md", ["y"])]);
    const next = reuseUnchanged(previous, ok([file("a.md", ["x"]), file("b.md", ["z"])]));
    if (next.status !== "ok" || previous.status !== "ok") throw new Error("expected ok");
    expect(next).not.toBe(previous);
    expect(next.files[0]).toBe(previous.files[0]);
    expect(next.files[1]).not.toBe(previous.files[1]);
  });

  it("takes the new result when a file is gone or HEAD moved", () => {
    const previous = ok([file("a.md", ["x"]), file("b.md", ["y"])]);
    expect(reuseUnchanged(previous, ok([file("a.md", ["x"])]))).not.toBe(previous);
    expect(reuseUnchanged(previous, ok([file("a.md", ["x"]), file("b.md", ["y"])], "d"))).not.toBe(previous);
  });

  it("passes other results through", () => {
    const next: ChangesResult = { status: "no-repo" };
    expect(reuseUnchanged(ok([]), next)).toBe(next);
    expect(reuseUnchanged(null, ok([]))).toEqual(ok([]));
  });
});
