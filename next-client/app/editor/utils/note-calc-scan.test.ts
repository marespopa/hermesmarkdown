import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  collectNoteCalcLabels,
  formatNoteCalcResult,
  NoteCalcCache,
  parseAssignment,
} from "./note-calc-scan";

// Labels by 1-based line number for a whole document.
function labels(lines: string[]): Record<number, string> {
  const doc = Text.of(lines);
  const cache = new NoteCalcCache();
  const out: Record<number, string> = {};
  for (const { pos, label } of collectNoteCalcLabels(doc, cache, [{ from: 0, to: doc.length }])) {
    out[doc.lineAt(pos).number] = label;
  }
  return out;
}

describe("parseAssignment", () => {
  it("matches single and multi-word names", () => {
    expect(parseAssignment("rent = 1200")).toEqual({ name: "rent", expression: " 1200" });
    expect(parseAssignment("Monthly  Rent = 1200")?.name).toBe("monthly rent");
  });

  it("never treats comparisons or `of` names as assignments", () => {
    for (const content of ["a == b", "a >= b", "a <= b", "a != b", "share of rent = 5"]) {
      expect(parseAssignment(content)).toBeNull();
    }
  });
});

describe("formatNoteCalcResult", () => {
  it("rounds to 4 decimals, trims zeros and hides -0 and non-finite", () => {
    expect(formatNoteCalcResult(1380)).toBe("= 1380");
    expect(formatNoteCalcResult(517.5)).toBe("= 517.5");
    expect(formatNoteCalcResult(1 / 3)).toBe("= 0.3333");
    expect(formatNoteCalcResult(-0.00001)).toBe("= 0");
    expect(formatNoteCalcResult(Infinity)).toBeNull();
  });
});

describe("scanLine via collectNoteCalcLabels", () => {
  it("labels only the expression line of the brief example", () => {
    expect(labels(["rent = 1200", "utilities = 180", "rent + utilities"])).toEqual({ 3: "= 1380" });
  });

  it("labels computed assignments and supports reassignment with self-reference", () => {
    expect(labels(["rent = 1200", "rent = rent + 100", "rent * 2"])).toEqual({ 2: "= 1300", 3: "= 2600" });
  });

  it("undefines a name after an invalid reassignment", () => {
    expect(labels(["rent = 1200", "rent = oops", "rent + 1"])).toEqual({});
    expect(labels(["rent = 1200", "rent =", "rent + 1"])).toEqual({});
  });

  it("handles percent lines and list items", () => {
    expect(labels(["450 + 15%", "- 15% of 200", "1. 200 * 15%"])).toEqual({ 1: "= 517.5", 2: "= 30", 3: "= 30" });
    expect(labels(["rent = 1200", "utilities = 180", "- rent + utilities"])).toEqual({ 3: "= 1380" });
  });

  it("skips comparisons", () => {
    expect(labels(["a = 1", "b = 2", "a == b", "a >= b", "a <= b", "a != b", "a + b"])).toEqual({ 7: "= 3" });
  });

  it("skips prose, headings, task lines, dates, phone numbers and bare literals", () => {
    expect(labels([
      "Some prose about 2 apples",
      "# 1 + 1",
      "- [ ] 2+2",
      "2026-10-01",
      "10/12/2024",
      "555-1234",
      "1200",
      "tax = 15%",
      "> 1 + 1",
      "| 1 + 1 |",
    ])).toEqual({});
    expect(labels(["10 - 12"])).toEqual({ 1: "= -2" });
  });

  it("ignores every line inside backtick and tilde fences", () => {
    expect(labels(["```", "x = 5", "1 + 1", "```", "x + 1"])).toEqual({});
    expect(labels(["~~~js", "x = 5", "~~~", "x + 1", "1 + 1"])).toEqual({ 5: "= 2" });
  });

  it("only closes a fence with the same character and at least the opener's length", () => {
    expect(labels(["````", "```", "1 + 1", "~~~~", "````", "2 + 2"])).toEqual({ 6: "= 4" });
  });

  it("treats an unterminated fence as running to the end", () => {
    expect(labels(["1 + 1", "```", "2 + 2", "3 + 3"])).toEqual({ 1: "= 2" });
  });

  it("ignores frontmatter and $$ blocks", () => {
    expect(labels(["---", "rate = 5", "---", "rate * 2", "1 + 1"])).toEqual({ 5: "= 2" });
    expect(labels(["$$", "1 + 1", "$$", "$$ 2 + 2 $$", "3 + 3"])).toEqual({ 5: "= 6" });
  });
});

describe("NoteCalcCache", () => {
  const lines = Array.from({ length: 1000 }, (_, i) => (i === 1 ? "base = 10" : `base + ${i + 1}`));
  const doc = Text.of(lines);

  it("only scans up to the requested line", () => {
    const cache = new NoteCalcCache();
    cache.ensure(doc, 10);
    expect(cache.size).toBe(10);
  });

  it("labels only lines in the visible range while resolving variables above it", () => {
    const cache = new NoteCalcCache();
    const range = { from: doc.line(500).from, to: doc.line(520).to };
    const result = collectNoteCalcLabels(doc, cache, [range]);
    expect(cache.size).toBe(520);
    expect(result).toHaveLength(21);
    expect(result.every(({ pos }) => pos >= range.from && pos <= range.to)).toBe(true);
    expect(result[0].label).toBe("= 510");
  });

  it("rescans only from the invalidated line", () => {
    const cache = new NoteCalcCache();
    cache.ensure(doc, 520);
    cache.invalidateFrom(500);
    expect(cache.size).toBe(499);
    const before = cache.scanCount;
    cache.ensure(doc, 520);
    expect(cache.scanCount - before).toBe(21);
  });
});
