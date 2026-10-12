import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { weekPeriod } from "@/app/utils/periods/period";
import { extractTasks } from "@/app/utils/taskExtractor";
import { openTasksBlock, OPEN_TASKS_LIMIT, reviewWeekOffset, todayLine, weekDataBlock } from "./skill-context";

// Monday, October 12, 2026 (week 42).
const NOW = new Date(2026, 9, 12, 9, 0);

function note(path: string, content: string, frontmatter: Record<string, unknown> = {}): FileMetadata {
  return {
    path, name: path.split("/").pop()!, tags: [], links: [], frontmatter, modifiedAt: 1, wordCount: 0,
    tasks: extractTasks(path, content), handle: null,
  } as FileMetadata;
}

describe("todayLine and reviewWeekOffset", () => {
  it("names today with its weekday", () => {
    expect(todayLine(NOW)).toBe("Today is 2026-10-12 (Monday).");
  });

  it("reviews last week only when asked", () => {
    expect(reviewWeekOffset("recap last week")).toBe(-1);
    expect(reviewWeekOffset("weekly review")).toBe(0);
    expect(reviewWeekOffset(undefined)).toBe(0);
  });
});

describe("weekDataBlock", () => {
  const period = weekPeriod(NOW);

  it("sends the week's days oldest first, leaving private sheets out", () => {
    const block = weekDataBlock(period, [
      { date: "2026-10-13", text: "- [ ] Draft roadmap\nReviewed the onboarding flow." },
      { date: "2026-10-12", text: "- [x] Ship billing export #feature" },
      { date: "2026-10-14", text: "- [x] Private item", sensitive: true },
    ]);
    expect(block).toContain(`WEEK DATA: ${period.heading} (2026-W42)`);
    expect(block).toContain("Ship billing export");
    expect(block).toContain("Reviewed the onboarding flow.");
    expect(block).not.toContain("Private item");
    expect(block).toContain("1 private daily sheet left out");
    expect(block.indexOf("[[2026-10-12]]")).toBeLessThan(block.indexOf("### [[2026-10-13]]"));
  });

  it("says so when there are no sheets", () => {
    expect(weekDataBlock(period, [])).toContain("No daily sheets for this week.");
  });
});

describe("openTasksBlock", () => {
  it("lists open tasks most pressing first, with their note, and counts private ones", () => {
    const meta = {
      "work.md": note("work.md", [
        "- [ ] Draft roadmap",
        "- [ ] Fix login redirect @due(2026-10-14) @priority(high) #bug",
        "- [/] Write release notes",
        "- [x] Ship billing export",
        "- [!] Migrate the database @due(2026-10-09)",
      ].join("\n")),
      "private.md": note("private.md", "- [ ] Private task", { sensitive: true }),
      "templates/standup.md": note("templates/standup.md", "- [ ] {{prompt:Task}}"),
    };
    const block = openTasksBlock(meta, NOW, (path) => path.startsWith("templates/"));
    const lines = block.split("\n").filter((line) => line.startsWith("- ["));
    expect(lines).toEqual([
      "- [/] Write release notes · [[work]]",
      "- [!] Migrate the database @due(2026-10-09) · [[work]]",
      "- [ ] Fix login redirect @due(2026-10-14) @priority(high) #bug · [[work]]",
      "- [ ] Draft roadmap · [[work]]",
    ]);
    expect(block).toContain("OPEN TASKS (1 in progress, 2 to do, 1 on hold)");
    expect(block).toContain("Today is 2026-10-12 (Monday).");
    expect(block).toContain("1 private task left out");
    expect(block).not.toContain("{{prompt:Task}}");
  });

  it("caps the list", () => {
    const many = Array.from({ length: OPEN_TASKS_LIMIT + 5 }, (_, i) => `- [ ] Task ${i + 1}`).join("\n");
    const block = openTasksBlock({ "backlog.md": note("backlog.md", many) }, NOW);
    expect(block).toContain("…and 5 more, less pressing.");
  });
});
