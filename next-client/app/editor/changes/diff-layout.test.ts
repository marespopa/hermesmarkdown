import { describe, expect, it } from "vitest";
import type { ChangedFile, DiffChange } from "@/app/services/git/git-changes-types";
import { buildFileDiff } from "@/app/services/git/git-file-diff";
import { initialCollapsed, layoutDiff, rowCount } from "./diff-layout";

const numbered = (count: number) => Array.from({ length: count }, (_, i) => "line " + (i + 1));
const diff = (lines: string[], changes: DiffChange[]) => ({ kind: "text" as const, lines, changes });
const file = (path: string, lines: string[], changes: DiffChange[]): ChangedFile => ({
  path,
  status: "modified",
  added: 0,
  removed: 0,
  diff: diff(lines, changes),
});

describe("layoutDiff", () => {
  it("shows 3 lines of context around a change and folds the rest", () => {
    const lines = numbered(20);
    const rows = layoutDiff(diff(lines, [{ oldStart: 10, removed: ["old"], newStart: 10, newCount: 1 }]), new Set());
    expect(rows.map((row) => row.kind)).toEqual(["gap", "context", "context", "context", "del", "add", "context", "context", "context", "gap"]);
    expect(rows[0]).toMatchObject({ kind: "gap", id: 0, count: 6 });
    expect(rows[9]).toMatchObject({ kind: "gap", id: 1, count: 7 });
    expect(rows[1]).toMatchObject({ oldNo: 7, newNo: 7 });
  });

  it("folds a long stretch between two changes and keeps a short one", () => {
    const lines = numbered(40);
    const far = layoutDiff(
      diff(lines, [{ oldStart: 2, removed: [], newStart: 2, newCount: 1 }, { oldStart: 30, removed: [], newStart: 30, newCount: 1 }]),
      new Set(),
    );
    expect(far.filter((row) => row.kind === "gap").map((row) => (row as { id: number }).id)).toEqual([1, 2]);
    const near = layoutDiff(
      diff(lines, [{ oldStart: 2, removed: [], newStart: 2, newCount: 1 }, { oldStart: 9, removed: [], newStart: 9, newCount: 1 }]),
      new Set(),
    );
    expect(near.some((row) => row.kind === "gap" && row.id === 1)).toBe(false);
  });

  it("shows only removed rows for a file emptied since HEAD", () => {
    const rows = layoutDiff(buildFileDiff("a\nb", ""), new Set());
    expect(rows).toEqual([
      { kind: "del", oldNo: 1, openLine: 1, text: "a" },
      { kind: "del", oldNo: 2, openLine: 1, text: "b" },
    ]);
  });

  it("shows every line of an expanded gap", () => {
    const changes = [{ oldStart: 10, removed: ["old"], newStart: 10, newCount: 1 }];
    const rows = layoutDiff(diff(numbered(20), changes), new Set([0, 1]));
    expect(rows.filter((row) => row.kind === "gap")).toHaveLength(0);
    expect(rows.filter((row) => row.kind === "context")).toHaveLength(19);
  });

  it("keeps old and new numbers right after a change that removes more than it adds", () => {
    const lines = numbered(10);
    const rows = layoutDiff(diff(lines, [{ oldStart: 2, removed: ["a", "b", "c"], newStart: 2, newCount: 1 }]), new Set());
    const after = rows.find((row) => row.kind === "context" && row.newNo === 3);
    expect(after).toMatchObject({ oldNo: 5, newNo: 3 });
    expect(rows.filter((row) => row.kind === "del").map((row) => (row as { oldNo: number }).oldNo)).toEqual([2, 3, 4]);
  });

  it("clamps the open line of a deletion at the end of the file", () => {
    const rows = layoutDiff(diff(["a", "b"], [{ oldStart: 3, removed: ["c"], newStart: 3, newCount: 0 }]), new Set());
    expect(rows.find((row) => row.kind === "del")).toMatchObject({ openLine: 2 });
    const all = layoutDiff(diff([], [{ oldStart: 1, removed: ["a"], newStart: 1, newCount: 0 }]), new Set());
    expect(all[0]).toMatchObject({ kind: "del", openLine: 1 });
  });
});

describe("initialCollapsed", () => {
  it("collapses a file over 400 rows", () => {
    const big = file("big.md", numbered(401), [{ oldStart: 0, removed: [], newStart: 1, newCount: 401 }]);
    expect(rowCount(big)).toBe(401);
    expect([...initialCollapsed([big, file("small.md", ["x"], [{ oldStart: 0, removed: [], newStart: 1, newCount: 1 }])])]).toEqual(["big.md"]);
  });

  it("collapses files past the 3,000-row budget", () => {
    const files = Array.from({ length: 9 }, (_, i) => file("f" + i + ".md", numbered(400), [{ oldStart: 0, removed: [], newStart: 1, newCount: 400 }]));
    expect([...initialCollapsed(files)]).toEqual(["f7.md", "f8.md"]);
  });
});
