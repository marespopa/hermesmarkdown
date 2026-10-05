// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { buildNoteDisplayItems, MASKED_PREVIEW, type PrivacyLevel } from "@/app/utils/note-display";
import { buildFeed as buildFeedWith, buildWeek, dayLabel, feedTitle, isFeedPath } from "./feed-model";

// Builds the feed through the display factory, as HomeFeed does.
function buildFeed(
  metadata: Record<string, FileMetadata>,
  now: Date,
  level: PrivacyLevel = "show_title",
  pinnedPaths: string[] = [],
) {
  return buildFeedWith(metadata, buildNoteDisplayItems(metadata, level), now, undefined, pinnedPaths);
}

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
      new Date(2026, 8, 26).toLocaleDateString(undefined, { weekday: "long" }),
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
    expect(feed[1].dayLabel).toBe(new Date(2026, 8, 26).toLocaleDateString(undefined, { weekday: "long" }));
    expect(feed[2].dayLabel).toBeNull();
  });

  it("leaves template files out, but not notes in its subfolders", () => {
    const metadata = {
      a: meta("a.md", new Date(2026, 8, 28, 9)),
      t: meta("templates/rfc.md", new Date(2026, 8, 28, 10)),
      s: meta("templates/archive/old.md", new Date(2026, 8, 28, 8)),
    };
    const feed = buildFeedWith(metadata, buildNoteDisplayItems(metadata, "show_title"), NOW, "templates");
    expect(feed.map((entry) => entry.path)).toEqual(["a.md", "templates/archive/old.md"]);
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
    expect(entry).toMatchObject({ isSensitive: false, previewStyle: "plain" });
  });

  it("puts pinned notes first, newest pin first, under one Pinned label", () => {
    const feed = buildFeed({
      a: meta("a.md", new Date(2026, 8, 28, 9)),
      b: meta("b.md", new Date(2026, 8, 27, 9)),
      c: meta("c.md", new Date(2026, 8, 20, 9)),
    }, NOW, "show_title", ["c.md", "b.md", "gone.md"]);

    expect(feed.map((entry) => [entry.path, entry.dayLabel, entry.isPinned])).toEqual([
      ["c.md", "Pinned", true],
      ["b.md", null, true],
      ["a.md", "Today", false],
    ]);
  });

  it("leaves pins out when the privacy level hides the note", () => {
    const feed = buildFeed({
      s: meta("secret.md", NOW, { frontmatter: { sensitive: "true" } }),
      a: meta("a.md", NOW),
    }, NOW, "hidden", ["secret.md"]);
    expect(feed.map((entry) => [entry.path, entry.dayLabel])).toEqual([["a.md", "Today"]]);
  });

  it("gives every note its file name, except sensitive notes", () => {
    const feed = buildFeed({
      titled: meta("notes/2026-09-28.md", NOW, { frontmatter: { title: "Weekly review" } }),
      plain: meta("notes/Plan.md", new Date(NOW.getTime() - 1000)),
      secret: meta("notes/diagnosis.md", new Date(NOW.getTime() - 2000), { frontmatter: { title: "Note", sensitive: true } }),
    }, NOW);
    expect(feed.map((entry) => entry.fileName)).toEqual(["2026-09-28.md", "Plan.md", null]);
  });

  it("carries sensitivity and the preview style of sensitive notes", () => {
    const notes = { s: meta("s.md", NOW, { preview: "Secret", frontmatter: { tags: "private" } }) };
    expect(buildFeed(notes, NOW)[0]).toMatchObject({ isSensitive: true, previewStyle: "masked", preview: MASKED_PREVIEW });
    expect(buildFeed(notes, NOW, "blurred")[0]).toMatchObject({ isSensitive: true, previewStyle: "blurred", preview: "Secret" });
  });

  it("leaves hidden notes out and recomputes day labels after exclusion", () => {
    const feed = buildFeed({
      s: meta("secret.md", new Date(2026, 8, 28, 12), { preview: "Secret", frontmatter: { sensitive: "true" } }),
      a: meta("a.md", new Date(2026, 8, 28, 9), { preview: "A" }),
      b: meta("b.md", new Date(2026, 8, 27, 9), { preview: "B" }),
    }, NOW, "hidden");

    expect(feed.map((entry) => entry.path)).toEqual(["a.md", "b.md"]);
    expect(feed[0].dayLabel).toBe("Today");
    expect(feed[1].dayLabel).toBe("Yesterday");
  });
});

describe("buildWeek", () => {
  it("covers the seven days ending today, with counts and each day's first row", () => {
    const feed = buildFeed({
      a: meta("a.md", new Date(2026, 8, 28, 9)),
      b: meta("b.md", new Date(2026, 8, 26, 18)),
      c: meta("c.md", new Date(2026, 8, 26, 10)),
      old: meta("old.md", new Date(2026, 8, 1)),
      undated: meta("undated.md", new Date(0)),
    }, NOW);
    const week = buildWeek(feed, NOW);

    expect(week.map((entry) => new Date(entry.day).getDate())).toEqual([22, 23, 24, 25, 26, 27, 28]);
    expect(week[6]).toMatchObject({ count: 1, firstIndex: 0 });
    expect(week[4]).toMatchObject({ count: 2, firstIndex: 1 });
    expect(week[5]).toMatchObject({ count: 0, firstIndex: -1 });
    expect(week.reduce((sum, entry) => sum + entry.count, 0)).toBe(3);
  });

  it("jumps to a day's first unpinned note, or its pinned one when that's all it has", () => {
    const feed = buildFeed({
      pinnedToday: meta("p.md", new Date(2026, 8, 28, 12)),
      today: meta("a.md", new Date(2026, 8, 28, 9)),
      pinnedOnly: meta("q.md", new Date(2026, 8, 27, 9)),
    }, NOW, "show_title", ["p.md", "q.md"]);
    const week = buildWeek(feed, NOW);

    expect(feed.map((entry) => entry.path)).toEqual(["p.md", "q.md", "a.md"]);
    expect(week[6]).toMatchObject({ count: 2, firstIndex: 2 });
    expect(week[5]).toMatchObject({ count: 1, firstIndex: 1 });
  });

  it("doesn't count notes the privacy level hides", () => {
    const feed = buildFeed({
      s: meta("secret.md", new Date(2026, 8, 28, 12), { frontmatter: { sensitive: "true" } }),
    }, NOW, "hidden");
    expect(buildWeek(feed, NOW)[6].count).toBe(0);
  });

  it("steps by calendar day across a DST change", () => {
    const week = buildWeek([], new Date(2026, 2, 31, 12)); // spans late-March DST in many zones
    expect(week.map((entry) => new Date(entry.day).getDate())).toEqual([25, 26, 27, 28, 29, 30, 31]);
    expect(week.every((entry) => new Date(entry.day).getHours() === 0)).toBe(true);
  });
});
