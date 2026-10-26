import { describe, expect, it } from "vitest";
import { browserOnlyEditOf, openedFromDisk } from "./open-merge";

const state = (content: string, lastSavedContent: string) => ({ content, lastSavedContent, fileName: "a.md", activeFilePath: "a.md" });

describe("openedFromDisk", () => {
  it("takes the disk text and its time", () => {
    expect(openedFromDisk(state("x", "x"), "a.md", "a.md", "disk", 7, null)).toEqual({
      content: "disk", lastSavedContent: "disk", fileName: "a.md", activeFilePath: "a.md", lastModified: 7,
    });
  });

  it("keeps differing browser edits as a local snapshot", () => {
    const next = openedFromDisk(state("edit", "x"), "a.md", "a.md", "disk", 7, "edit");
    expect(next.snapshots).toEqual([expect.objectContaining({ type: "local", content: "edit" })]);
  });

  it("adds no snapshot when the edits match the disk", () => {
    expect(openedFromDisk(state("disk", "x"), "a.md", "a.md", "disk", 7, "disk").snapshots).toBeUndefined();
  });
});

describe("browserOnlyEditOf", () => {
  it("is the unsaved text, never blank text", () => {
    expect(browserOnlyEditOf(state("edit", "x"))).toBe("edit");
    expect(browserOnlyEditOf(state("same", "same"))).toBeNull();
    expect(browserOnlyEditOf(state("  ", "x"))).toBeNull();
    expect(browserOnlyEditOf(undefined)).toBeNull();
  });
});
