import { describe, expect, it } from "vitest";
import { fuzzyMatch, matchCommand, matchFile } from "./command-search";

describe("command search ranking", () => {
  it("ranks exact prefixes above later or scattered matches", () => {
    expect(fuzzyMatch("open", "Open settings")!.score).toBeGreaterThan(
      fuzzyMatch("open", "Reopen settings")!.score,
    );
    expect(fuzzyMatch("ofs", "Open file settings")!.score).toBeGreaterThan(0);
  });

  it("matches command metadata without highlighting the label", () => {
    const match = matchCommand("preferences", {
      id: "open-settings",
      label: "Open settings",
      category: "Settings",
      keywords: ["configuration", "preferences"],
    });

    expect(match).not.toBeNull();
    expect(match?.indices).toEqual([]);
  });

  it("returns null when the query is not a subsequence", () => {
    expect(fuzzyMatch("vault", "Open settings")).toBeNull();
  });

  it("prioritizes title matches while retaining path highlights", () => {
    const match = matchFile("plan", { name: "Plan.md", path: "projects/planning/Plan.md" });

    expect(match?.titleIndices).toEqual([0, 1, 2, 3]);
    expect(match?.pathIndices).toEqual(expect.arrayContaining([9, 10, 11, 12]));
    expect(match?.score).toBeGreaterThan(matchFile("plan", { name: "Notes.md", path: "projects/planning/Notes.md" })!.score);
  });

  it("filters 5,000 local file records within the interaction budget", () => {
    const files = Array.from({ length: 5_000 }, (_, index) => ({
      name: `Project ${index}.md`,
      path: `notes/projects/Project ${index}.md`,
    }));
    const start = performance.now();
    const matches = files.map((file) => matchFile("project", file)).filter(Boolean);

    expect(matches).toHaveLength(5_000);
    expect(performance.now() - start).toBeLessThan(16);
  });
});
