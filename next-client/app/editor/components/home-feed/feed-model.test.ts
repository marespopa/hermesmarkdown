// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { buildNoteDisplayItems, MASKED_PREVIEW, type PrivacyLevel } from "@/app/utils/note-display";
import { extractTasks } from "@/app/utils/taskExtractor";
import { buildFeed as buildFeedWith, dayLabel, feedStats, feedTags, feedTitle, isFeedPath, openFeedTasks, withTodaySheet } from "./feed-model";

// Builds the feed through the display factory, as HomeFeed does.
function buildFeed(
  metadata: Record<string, FileMetadata>,
  now: Date,
  level: PrivacyLevel = "show_title",
  pinnedPaths: string[] = [],
  tagFilter: string[] = [],
) {
  return buildFeedWith(metadata, buildNoteDisplayItems(metadata, level), now, undefined, pinnedPaths, tagFilter);
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

describe("tag filter", () => {
  const notes = () => ({
    a: meta("a.md", new Date(2026, 8, 28, 9), { tags: ["work", "plan"] }),
    b: meta("b.md", new Date(2026, 8, 27, 9), { tags: ["work"] }),
    c: meta("c.md", new Date(2026, 8, 26, 9), { tags: ["home"] }),
  });

  it("keeps notes carrying every filter tag and relabels their days", () => {
    expect(buildFeed(notes(), NOW, "show_title", [], ["work"]).map((entry) => entry.path)).toEqual(["a.md", "b.md"]);
    const feed = buildFeed(notes(), NOW, "show_title", [], ["work", "plan"]);
    expect(feed.map((entry) => entry.path)).toEqual(["a.md"]);
    const home = buildFeed(notes(), NOW, "show_title", [], ["home"]);
    expect(home[0].dayLabel).toBe(new Date(2026, 8, 26).toLocaleDateString(undefined, { weekday: "long" }));
  });

  it("labels the first matching pinned note Pinned", () => {
    const feed = buildFeed(notes(), NOW, "show_title", ["c.md", "b.md"], ["work"]);
    expect(feed.map((entry) => [entry.path, entry.dayLabel])).toEqual([["b.md", "Pinned"], ["a.md", "Today"]]);
  });

  it("counts tags most used first, then most recent, never from sensitive notes", () => {
    const feed = buildFeed({
      ...notes(),
      s: meta("s.md", new Date(2026, 8, 28, 12), { tags: ["secret", "home"], frontmatter: { sensitive: "true" } }),
    }, NOW);
    expect(feed.find((entry) => entry.path === "s.md")?.tags).toEqual([]);
    expect(feedTags(feed)).toEqual([
      { tag: "work", count: 2 },
      { tag: "plan", count: 1 },
      { tag: "home", count: 1 },
    ]);
  });
});

describe("openFeedTasks", () => {
  const day = (daysAgo: number, hour = 10) => new Date(2026, 8, 28 - daysAgo, hour);
  const withTasks = (path: string, at: Date, body: string, extra: Partial<FileMetadata> = {}) =>
    meta(path, at, { tasks: extractTasks(path, body), ...extra });

  it("lists unchecked tasks from the last week's notes, newest note first, in line order", () => {
    const metadata = {
      "a.md": withTasks("a.md", day(2), "- [ ] second note\n- [x] done"),
      "b.md": withTasks("b.md", day(0), "intro\n- [ ] later line\n- [ ] \n"),
      "old.md": withTasks("old.md", day(7), "- [ ] too old"),
    };
    metadata["b.md"].tasks.reverse();
    const tasks = openFeedTasks(buildFeed(metadata, NOW), metadata, NOW);
    expect(tasks.map((task) => [task.path, task.line, task.text])).toEqual([
      ["b.md", 1, "later line"],
      ["b.md", 2, ""],
      ["a.md", 0, "second note"],
    ]);
    expect(tasks[0].noteTitle).toBe("b");
  });

  it("keeps a note edited six days ago, from midnight", () => {
    const metadata = { "edge.md": withTasks("edge.md", day(6, 0), "- [ ] edge") };
    expect(openFeedTasks(buildFeed(metadata, NOW), metadata, NOW)).toHaveLength(1);
  });

  it("leaves out sensitive notes and notes outside the feed", () => {
    const metadata = {
      "secret.md": withTasks("secret.md", day(0), "- [ ] hidden", { frontmatter: { sensitive: true } }),
      ".hermes/x.md": withTasks(".hermes/x.md", day(0), "- [ ] meta"),
    };
    expect(openFeedTasks(buildFeed(metadata, NOW), metadata, NOW)).toEqual([]);
  });
});

describe("feedStats", () => {
  it("counts the notes and those edited since midnight", () => {
    const metadata = {
      "a.md": meta("a.md", new Date(2026, 8, 28, 0, 5)),
      "b.md": meta("b.md", new Date(2026, 8, 27, 23, 55)),
      "c.md": meta("c.md", new Date(0)),
    };
    expect(feedStats(buildFeed(metadata, NOW), NOW)).toEqual({ notes: 3, editedToday: 1 });
  });
});

describe("withTodaySheet", () => {
  const SHEET = "journal/2026-09-28.md";

  it("adds a row that starts the sheet, heading Today after the pins", () => {
    const metadata = { "a.md": meta("a.md", new Date(2026, 8, 28, 14)), "p.md": meta("p.md", new Date(2026, 8, 1)) };
    const feed = withTodaySheet(buildFeed(metadata, NOW, "show_title", ["p.md"]), { path: SHEET, exists: false }, NOW);
    expect(feed.map((entry) => [entry.path, entry.dayLabel, entry.todaySheet])).toEqual([
      ["p.md", "Pinned", undefined],
      [SHEET, "Today", "missing"],
      ["a.md", null, undefined],
    ]);
    expect(feed[1].fileName).toBe("2026-09-28.md");
  });

  it("moves the existing sheet to the top of Today, marked", () => {
    const metadata = {
      [SHEET]: meta(SHEET, new Date(2026, 8, 28, 9)),
      "b.md": meta("b.md", new Date(2026, 8, 28, 14)),
    };
    const feed = withTodaySheet(buildFeed(metadata, NOW), { path: SHEET, exists: true }, NOW);
    expect(feed.map((entry) => [entry.path, entry.dayLabel, entry.todaySheet])).toEqual([
      [SHEET, "Today", "existing"],
      ["b.md", null, undefined],
    ]);
  });

  it("leaves a pinned sheet pinned, and adds nothing for a sheet the feed hides", () => {
    const metadata = { [SHEET]: meta(SHEET, new Date(2026, 8, 28, 9)) };
    const pinned = buildFeed(metadata, NOW, "show_title", [SHEET]);
    expect(withTodaySheet(pinned, { path: SHEET, exists: true }, NOW)).toBe(pinned);
    const hidden = buildFeed({}, NOW);
    expect(withTodaySheet(hidden, { path: SHEET, exists: true }, NOW)).toBe(hidden);
  });
});
