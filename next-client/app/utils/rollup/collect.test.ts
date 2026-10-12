// @vitest-environment node
import { describe, expect, it } from "vitest";
import { collectRollup, groupDone } from "./collect";

const texts = (items: { text: string }[]) => items.map((item) => item.text);

describe("collectRollup", () => {
  it("sorts tasks into done, blocked and still open", () => {
    const data = collectRollup([
      {
        date: "2026-10-06",
        text: [
          "- [x] Fix login redirect #bug",
          "- [!] Deploy billing service",
          "- [!] Renew TLS certificate",
          "- [/] Write release notes",
          "- [ ] Update pricing page #blocked",
          "- [-] Drop legacy export",
        ].join("\n"),
      },
    ]);
    expect(texts(data.done)).toEqual(["Fix login redirect"]);
    expect(texts(data.blocked)).toEqual(["Deploy billing service", "Renew TLS certificate"]);
    // A #blocked tag is just a tag; only the [!] box puts a task on hold.
    expect(texts(data.open)).toEqual(["Write release notes", "Update pricing page"]);
    expect(data.open[0].inProgress).toBe(true);
    expect(data.open[1].tags).toEqual(["blocked"]);
    expect(data.sheetCount).toBe(1);
  });

  it("leaves out a task cancelled on its latest day, with its earlier occurrences", () => {
    const data = collectRollup([
      { date: "2026-10-05", text: "- [ ] Migrate search index" },
      { date: "2026-10-06", text: "- [-] Migrate search index" },
    ]);
    expect(data.open).toEqual([]);
    expect(data.done).toEqual([]);
    expect(data.blocked).toEqual([]);
  });

  it("counts a task once, as done, when it was open Monday and checked Wednesday", () => {
    const data = collectRollup([
      { date: "2026-10-07", text: "- [x] Ship onboarding email" },
      { date: "2026-10-05", text: "- [ ] Ship onboarding email" },
    ]);
    expect(data.open).toEqual([]);
    expect(data.done).toEqual([expect.objectContaining({ text: "Ship onboarding email", date: "2026-10-07" })]);
  });

  it("counts a task checked Monday and reopened Tuesday as open", () => {
    const data = collectRollup([
      { date: "2026-10-05", text: "- [x] Fix export button" },
      { date: "2026-10-06", text: "- [ ] Fix export button" },
    ]);
    expect(data.done).toEqual([]);
    expect(data.open).toEqual([expect.objectContaining({ date: "2026-10-06" })]);
  });

  it("dedupes across case and whitespace differences", () => {
    const data = collectRollup([
      { date: "2026-10-05", text: "- [ ] Fix   Export button" },
      { date: "2026-10-06", text: "- [ ] fix export button #web" },
    ]);
    expect(data.open).toHaveLength(1);
    expect(data.open[0]).toMatchObject({ text: "fix export button", tags: ["web"], date: "2026-10-06" });
  });

  it("orders each list by date, then line", () => {
    const data = collectRollup([
      { date: "2026-10-08", text: "- [ ] Review analytics dashboard" },
      { date: "2026-10-06", text: "- [ ] Draft roadmap\n- [ ] Clean up feature flags" },
    ]);
    expect(texts(data.open)).toEqual(["Draft roadmap", "Clean up feature flags", "Review analytics dashboard"]);
  });

  it("skips tasks with no text left after stripping tags", () => {
    const data = collectRollup([{ date: "2026-10-06", text: "- [ ] #bug\n- [x] @due(2026-10-09)\n- [ ] Real task" }]);
    expect(texts(data.open)).toEqual(["Real task"]);
    expect(data.done).toEqual([]);
  });

  it("counts the sheets it was given, even with no tasks", () => {
    expect(collectRollup([{ date: "2026-10-05", text: "# Monday" }, { date: "2026-10-06", text: "" }]).sheetCount).toBe(2);
    expect(collectRollup([]).sheetCount).toBe(0);
  });
});

describe("groupDone", () => {
  it("groups by first tag, alphabetically, with untagged items last", () => {
    const data = collectRollup([
      {
        date: "2026-10-06",
        text: "- [x] Update docs\n- [x] Weekly sync #meeting\n- [x] Fix login redirect #bug #auth\n- [x] Fix crash on save #bug",
      },
    ]);
    expect(groupDone(data.done).map((group) => [group.tag, texts(group.items)])).toEqual([
      ["bug", ["Fix login redirect", "Fix crash on save"]],
      ["meeting", ["Weekly sync"]],
      [null, ["Update docs"]],
    ]);
  });
});
