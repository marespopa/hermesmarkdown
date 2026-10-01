// @vitest-environment node
import { describe, expect, it } from "vitest";
import { dateStamp, draftTitle, isDraftTitleSettled } from "./draft-title";

const NOW = new Date(2026, 8, 28, 14, 32);

describe("draftTitle", () => {
  it("uses the first line of text", () => {
    expect(draftTitle("Weekly review\nNotes here", NOW)).toBe("Weekly review");
  });

  it("skips leading blank lines and strips heading markers", () => {
    expect(draftTitle("\n\n## Project kickoff\n", NOW)).toBe("Project kickoff");
  });

  it("strips list, task, quote and inline markdown", () => {
    expect(draftTitle("- [ ] **Call** the `bank`", NOW)).toBe("Call the bank");
    expect(draftTitle("> A quote", NOW)).toBe("A quote");
    expect(draftTitle("See [the docs](https://x.y) and [[Other Note|alias]]", NOW)).toBe("See the docs and alias");
  });

  it("removes characters that are illegal in file names", () => {
    expect(draftTitle('Q3: plan / budget? "final" | v2', NOW)).toBe("Q3 plan budget final v2");
  });

  it("never produces a hidden file or a trailing dot", () => {
    expect(draftTitle("...secret thoughts...", NOW)).toBe("secret thoughts");
  });

  it("caps long titles at a word boundary", () => {
    const title = draftTitle("word ".repeat(30), NOW);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.endsWith("word")).toBe(true);
  });

  it("skips a leading frontmatter block", () => {
    expect(draftTitle("---\ntags: [x]\n---\nReal title\n", NOW)).toBe("Real title");
  });

  it("falls back to a date stamp when nothing usable is left", () => {
    expect(draftTitle("   \n", NOW)).toBe("2026-09-28 1432");
    expect(draftTitle("# ???", NOW)).toBe("2026-09-28 1432");
  });
});

describe("dateStamp", () => {
  it("zero-pads every part", () => {
    expect(dateStamp(new Date(2026, 0, 5, 7, 3))).toBe("2026-01-05 0703");
  });
});

describe("isDraftTitleSettled", () => {
  it("is false while the first line is still being typed", () => {
    expect(isDraftTitleSettled("Meeting wi")).toBe(false);
    expect(isDraftTitleSettled("\n\nMeeting wi")).toBe(false);
    expect(isDraftTitleSettled("")).toBe(false);
  });

  it("is true once a line break follows the first line", () => {
    expect(isDraftTitleSettled("Meeting with Ana\n")).toBe(true);
  });

  it("ignores frontmatter when finding the first line", () => {
    expect(isDraftTitleSettled("---\na: 1\n---\nTitle")).toBe(false);
    expect(isDraftTitleSettled("---\na: 1\n---\nTitle\n")).toBe(true);
  });
});
