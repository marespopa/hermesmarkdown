// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { buildNoteDisplayItems, MASKED_PREVIEW, type PrivacyLevel } from "@/app/utils/note-display";
import { buildFeed as buildFeedWith, dayLabel, feedTitle, isFeedPath } from "./feed-model";

// Builds the feed through the display factory, as HomeFeed does.
function buildFeed(metadata: Record<string, FileMetadata>, now: Date, level: PrivacyLevel = "show_title") {
  return buildFeedWith(metadata, buildNoteDisplayItems(metadata, level), now);
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
