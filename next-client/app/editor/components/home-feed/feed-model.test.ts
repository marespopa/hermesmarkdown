// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { buildFeed, dayLabel, feedTitle, isFeedPath } from "./feed-model";

const NOW = new Date(2026, 8, 28, 15, 0); // Mon Sep 28 2026

function meta(path: string, modifiedAt: Date, extra: Partial<FileMetadata> = {}): FileMetadata {
  return {
    path,
    name: path.split("/").pop()!,
    tags: [],
    links: [],
    frontmatter: {},
    modifiedAt: modifiedAt.getTime(),
    wordCount: 0,
    tasks: [],
    handle: null,
    ...extra,
  };
}

describe("isFeedPath", () => {
  it("keeps markdown notes and drops hidden, meta and other files", () => {
    expect(isFeedPath("notes/plan.md")).toBe(true);
    expect(isFeedPath(".hermes/skill.md")).toBe(false);
    expect(isFeedPath("a/.obsidian/x.md")).toBe(false);
    expect(isFeedPath("_meta.md")).toBe(false);
    expect(isFeedPath("image.png")).toBe(false);
  });
});

describe("feedTitle", () => {
  it("prefers a frontmatter title, else the file name", () => {
    expect(feedTitle({ name: "a.md", frontmatter: { title: " Plan " } })).toBe("Plan");
    expect(feedTitle({ name: "Weekly review.md", frontmatter: {} })).toBe("Weekly review");
  });
});

describe("dayLabel", () => {
  it("says Today and Yesterday, a weekday this week, a date after that", () => {
    expect(dayLabel(new Date(2026, 8, 28, 1).getTime(), NOW)).toBe("Today");
    expect(dayLabel(new Date(2026, 8, 27, 23, 59).getTime(), NOW)).toBe("Yesterday");
    expect(dayLabel(new Date(2026, 8, 26).getTime(), NOW)).toBe(
      new Date(2026, 8, 26).toLocaleDateString(undefined, { weekday: "short" }),
    );
    expect(dayLabel(new Date(2026, 8, 1).getTime(), NOW)).toBe(
      new Date(2026, 8, 1).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    );
  });

  it("adds the year for earlier years", () => {
    const old = new Date(2025, 11, 31);
    expect(dayLabel(old.getTime(), NOW)).toBe(
      old.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    );
  });
});

describe("buildFeed", () => {
  it("sorts newest first and labels only the first note of each day", () => {
    const feed = buildFeed({
      a: meta("a.md", new Date(2026, 8, 28, 9)),
      b: meta("b.md", new Date(2026, 8, 26, 10)),
      c: meta("c.md", new Date(2026, 8, 26, 18)),
      d: meta(".hermes/d.md", new Date(2026, 8, 28, 12)),
    }, NOW);

    expect(feed.map((entry) => entry.path)).toEqual(["a.md", "c.md", "b.md"]);
    expect(feed[0].dayLabel).toBe("Today");
    expect(feed[1].dayLabel).toBe(new Date(2026, 8, 26).toLocaleDateString(undefined, { weekday: "short" }));
    expect(feed[2].dayLabel).toBeNull();
  });

  it("orders stat-dated notes by date and undated ones last, without a label", () => {
    const feed = buildFeed({
      z: meta("zeta.md", new Date(0)),
      a: meta("alpha.md", new Date(0)),
      d: meta("dated.md", new Date(2026, 7, 1), { preview: "Parsed" }),
      s: meta("stat-only.md", new Date(2026, 6, 1)),
    }, NOW);

    expect(feed.map((entry) => entry.path)).toEqual(["dated.md", "stat-only.md", "alpha.md", "zeta.md"]);
    expect(feed[0]).toMatchObject({ isIndexed: true });
    expect(feed[0].dayLabel).toBeTruthy();
    // Dated by the stat pass but not parsed yet: labelled, preview pending.
    expect(feed[1].isIndexed).toBe(false);
    expect(feed[1].dayLabel).toBeTruthy();
    expect(feed[2]).toMatchObject({ isIndexed: false, dayLabel: null });
    expect(feed[3]).toMatchObject({ isIndexed: false, dayLabel: null });
  });

  it("passes the indexed preview through", () => {
    const [entry] = buildFeed({ a: meta("a.md", NOW, { preview: "Body text" }) }, NOW);
    expect(entry.preview).toBe("Body text");
  });
});
