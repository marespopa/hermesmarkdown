// @vitest-environment node
import { describe, expect, it } from "vitest";
import { collectRollup } from "./collect";
import { parseRollupName } from "./period";
import { renderGeneratedBody, renderNewSheet, renderSummary, ROLLUP_END, ROLLUP_START } from "./render";

const week = parseRollupName("2026-W41.md")!;
const month = parseRollupName("2026-10.md")!;

const SHEETS = [
  { date: "2026-10-06", text: "- [x] Fix login redirect #bug #auth\n- [x] Update docs" },
  { date: "2026-10-08", text: "- [!] Deploy billing service #infra @due(2026-10-14)" },
  { date: "2026-10-09", text: "- [/] Write release notes @due(2026-10-16)" },
];

describe("renderGeneratedBody (weekly)", () => {
  it("renders the summary, grouped Done, Blocked and Still open", () => {
    expect(renderGeneratedBody(week, collectRollup(SHEETS))).toBe(
      [
        "2 done · 1 open · 1 blocked",
        "",
        "## Done",
        "",
        "### #bug",
        "- Fix login redirect #auth · [[2026-10-06]]",
        "",
        "### Other",
        "- Update docs · [[2026-10-06]]",
        "",
        "## Blocked",
        "- Deploy billing service #infra · due 2026-10-14 · [[2026-10-08]]",
        "",
        "## Still open",
        "- Write release notes · in progress · due 2026-10-16 · [[2026-10-09]]",
      ].join("\n"),
    );
  });

  it("links a task done in another note to that note", () => {
    const data = collectRollup([], {
      range: { first: "2026-10-05", last: "2026-10-11" },
      doneElsewhere: [{ note: "Roadmap", doneDate: "2026-10-07", line: 2, text: "Draft the Q4 plan", tags: [] }],
    });
    expect(renderGeneratedBody(week, data)).toContain("### Other\n- Draft the Q4 plan · [[Roadmap]]");
  });

  it("renders empty sections as a heading and a blank line", () => {
    expect(renderGeneratedBody(week, collectRollup([]))).toBe(
      "No daily sheets this week\n\n## Done\n\n## Blocked\n\n## Still open\n",
    );
  });

  it("never renders an item as a task line", () => {
    const body = renderGeneratedBody(week, collectRollup([
      ...SHEETS,
      { date: "2026-10-10", text: "- [ ] [ ] Nested box text\n- [x] [x] Already ticked" },
    ]));
    for (const line of body.split("\n")) expect(line.startsWith("- [")).toBe(false);
  });
});

describe("renderSummary", () => {
  it("counts done, open and blocked separately", () => {
    expect(renderSummary(collectRollup(SHEETS), week)).toBe("2 done · 1 open · 1 blocked");
  });

  it("says when the period has no daily sheets", () => {
    expect(renderSummary(collectRollup([]), week)).toBe("No daily sheets this week");
    expect(renderSummary(collectRollup([]), month)).toBe("No daily sheets this month");
  });
});

describe("renderGeneratedBody (monthly)", () => {
  it("folds each Done group into a callout with its count", () => {
    const body = renderGeneratedBody(month, collectRollup([
      ...SHEETS,
      { date: "2026-10-20", text: "- [x] Fix crash on save #bug" },
    ]));
    expect(body).toContain(
      "## Done\n\n> [!success]- #bug · 2\n> - Fix login redirect #auth · [[2026-10-06]]\n> - Fix crash on save · [[2026-10-20]]\n\n> [!success]- Other · 1\n> - Update docs · [[2026-10-06]]\n\n## Blocked",
    );
  });

  it("collects only the weeks that have notes", () => {
    const body = renderGeneratedBody(month, collectRollup(SHEETS), [
      { name: "2026-W41", label: "Week 41", notes: "Shipped the billing beta.\n\n### Next\nPricing review" },
      { name: "2026-W42", label: "Week 42", notes: "  \n" },
    ]);
    expect(body.endsWith("## Weekly notes\n\n### Week 41 · [[2026-W41]]\nShipped the billing beta.\n\n### Next\nPricing review")).toBe(true);
    expect(body).not.toContain("Week 42");
  });

  it("leaves Weekly notes as a bare heading when no week has notes", () => {
    expect(renderGeneratedBody(month, collectRollup(SHEETS)).endsWith("## Weekly notes\n")).toBe(true);
  });
});

describe("renderNewSheet", () => {
  it("wraps the body in the markers and puts the caret under Notes", () => {
    const { text, cursor } = renderNewSheet(week, "body", false);
    expect(text).toBe(`# ${week.heading}\n\n${ROLLUP_START}\nbody\n${ROLLUP_END}\n\n## Notes\n\n`);
    expect(text.slice(0, cursor).endsWith("## Notes\n")).toBe(true);
    expect(text.slice(cursor)).toBe("\n");
  });

  it("starts with sensitive frontmatter when asked", () => {
    expect(renderNewSheet(month, "body", true).text.startsWith("---\nsensitive: true\n---\n\n# ")).toBe(true);
  });
});

describe("renderGeneratedBody (quarterly, yearly)", () => {
  const quarter = parseRollupName("2026-Q4.md")!;
  const year = parseRollupName("2026-year.md")!;

  it("collects the months' notes in a quarter and folds Done", () => {
    const body = renderGeneratedBody(quarter, collectRollup(SHEETS), [
      { name: "2026-10", label: "October", notes: "Billing beta shipped." },
    ]);
    expect(body).toContain("> [!success]- #bug");
    expect(body.endsWith("## Monthly notes\n\n### October · [[2026-10]]\nBilling beta shipped.")).toBe(true);
  });

  it("collects the quarters' notes in a year", () => {
    const body = renderGeneratedBody(year, collectRollup([]), [{ name: "2026-Q4", label: "Q4", notes: "Pricing moved." }]);
    expect(body.startsWith("No daily sheets this year")).toBe(true);
    expect(body.endsWith("## Quarterly notes\n\n### Q4 · [[2026-Q4]]\nPricing moved.")).toBe(true);
    expect(renderSummary(collectRollup([]), quarter)).toBe("No daily sheets this quarter");
  });
});
