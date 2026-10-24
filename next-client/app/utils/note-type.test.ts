import { describe, expect, it } from "vitest";
import { noteTypeOf } from "./note-type";

describe("noteTypeOf", () => {
  it("reads the frontmatter's type, trimmed and lowercased", () => {
    expect(noteTypeOf({ frontmatter: { type: " Project " }, tags: [] })).toBe("project");
  });

  it("falls back to a type/ tag, and the frontmatter wins over it", () => {
    expect(noteTypeOf({ frontmatter: {}, tags: ["work", "type/task"] })).toBe("task");
    expect(noteTypeOf({ frontmatter: { type: "meeting" }, tags: ["type/task"] })).toBe("meeting");
  });

  it("is null without a type", () => {
    expect(noteTypeOf({ frontmatter: {}, tags: ["work"] })).toBeNull();
    expect(noteTypeOf(undefined)).toBeNull();
  });
});
