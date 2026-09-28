import { describe, it, expect } from "vitest";
import { reconcileWithDisk } from "./reconcile-disk";
import type { FileState } from "@/app/atoms/file-atoms";

const base = (overrides: Partial<FileState> = {}): FileState => ({
  content: "cached",
  lastSavedContent: "cached",
  fileName: "note.md",
  activeFilePath: "note.md",
  lastModified: 100,
  ...overrides,
});

describe("reconcileWithDisk", () => {
  it("returns the same state when disk matches and nothing changed", () => {
    const state = base();
    expect(reconcileWithDisk(state, "cached", 100, false)).toBe(state);
  });

  it("records the new mtime when content already matches disk", () => {
    const state = base({ lastModified: undefined });
    const next = reconcileWithDisk(state, "cached", 200, false);
    expect(next).toMatchObject({ content: "cached", lastSavedContent: "cached", lastModified: 200 });
  });

  it("marks a dirty tab saved when its edits already match disk", () => {
    const state = base({ content: "edited", lastSavedContent: "cached" });
    const next = reconcileWithDisk(state, "edited", 200, false);
    expect(next).toMatchObject({ content: "edited", lastSavedContent: "edited", lastModified: 200 });
  });

  it("takes the disk version when the tab has no local edits", () => {
    const state = base();
    const next = reconcileWithDisk(state, "changed on disk", 200, false);
    expect(next).toMatchObject({
      content: "changed on disk",
      lastSavedContent: "changed on disk",
      lastModified: 200,
    });
    expect(next.conflict).toBeUndefined();
  });

  it("keeps local edits when the disk file is unchanged", () => {
    const state = base({ content: "edited" });
    const next = reconcileWithDisk(state, "cached", 200, false);
    expect(next).toMatchObject({ content: "edited", lastSavedContent: "cached", lastModified: 200 });
    expect(next.conflict).toBeUndefined();
  });

  it("raises a conflict when both sides changed", () => {
    const state = base({ content: "edited" });
    const next = reconcileWithDisk(state, "changed on disk", 200, false);
    expect(next.content).toBe("edited");
    expect(next.conflict).toEqual({ remoteContent: "changed on disk" });
    expect(next.snapshots).toBeUndefined();
  });

  it("snapshots both sides on conflict when enabled", () => {
    const state = base({ content: "edited" });
    const next = reconcileWithDisk(state, "changed on disk", 200, true);
    expect(next.snapshots?.map((s) => [s.type, s.content])).toEqual([
      ["remote", "changed on disk"],
      ["local", "edited"],
    ]);
  });

  it("does not re-raise an identical pending conflict", () => {
    const state = base({ content: "edited", conflict: { remoteContent: "changed on disk" } });
    expect(reconcileWithDisk(state, "changed on disk", 200, true)).toBe(state);
  });
});
