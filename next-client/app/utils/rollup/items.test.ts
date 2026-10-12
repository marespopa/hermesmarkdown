import { describe, expect, it } from "vitest";
import { ROLLUP_START, REGEX_ROLLUP_START } from "./render";
import { addedItemLines, findSourceTask, parseRollupItem, parseSummary, summaryOf } from "./items";

describe("parseRollupItem", () => {
  it("reads the text and day of an item, without tags and details", () => {
    expect(parseRollupItem("- Fix login redirect #bug · in progress · due 2026-10-09 · [[2026-10-06]]")).toEqual({
      text: "Fix login redirect",
      date: "2026-10-06",
    });
    expect(parseRollupItem("> - Ship billing export · [[2026-10-07]]")).toEqual({ text: "Ship billing export", date: "2026-10-07" });
    expect(parseRollupItem("- \\[x] Literal box text · [[2026-10-07]]")).toEqual({ text: "[x] Literal box text", date: "2026-10-07" });
  });

  it("is null for anything that isn't an item line", () => {
    expect(parseRollupItem("## Still open")).toBeNull();
    expect(parseRollupItem("- A plain bullet")).toBeNull();
    expect(parseRollupItem("- [[2026-10-06]]")).toBeNull();
  });
});

describe("findSourceTask", () => {
  const day = "# Mon\n- [ ] Draft roadmap #planning\n- [x] Fix login redirect\n- [ ] Draft roadmap #planning @due(2026-10-09)\n";

  it("finds the last task with the item's text", () => {
    expect(findSourceTask(day, { text: "Draft roadmap", date: "2026-10-06" })?.line).toBe(3);
    expect(findSourceTask(day, { text: "fix  LOGIN redirect", date: "2026-10-06" })?.checked).toBe(true);
  });

  it("is null when the task is gone", () => {
    expect(findSourceTask(day, { text: "Review pricing page", date: "2026-10-06" })).toBeNull();
  });
});

describe("summaries", () => {
  it("parses the summary line, and finds it after rollup:start", () => {
    expect(parseSummary("12 done · 4 open · 1 blocked")).toEqual({ done: 12, open: 4, blocked: 1 });
    expect(parseSummary("No daily sheets this week")).toBeNull();
    expect(summaryOf(`# Week 41\n\n${ROLLUP_START}\n3 done · 2 open · 0 blocked\n`, REGEX_ROLLUP_START)).toEqual({ done: 3, open: 2, blocked: 0 });
    expect(summaryOf("# Week 41\n3 done · 2 open · 0 blocked\n", REGEX_ROLLUP_START)).toBeNull();
  });
});

describe("addedItemLines", () => {
  it("lists the item lines that weren't there before", () => {
    const before = "1 done · 0 open · 0 blocked\n- Draft roadmap · [[2026-10-06]]";
    const after = "2 done · 0 open · 0 blocked\n- Draft roadmap · [[2026-10-06]]\n> - Ship billing export · [[2026-10-07]]\n## Blocked";
    expect(addedItemLines(before, after)).toEqual(["> - Ship billing export · [[2026-10-07]]"]);
  });

  it("marks nothing new on a brand-new sheet", () => {
    expect(addedItemLines(null, "- Draft roadmap · [[2026-10-06]]")).toEqual([]);
  });
});
