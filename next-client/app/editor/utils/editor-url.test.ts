import { describe, expect, it } from "vitest";
import { editorFileHref, editorTagHref } from "./editor-url";

describe("editor URLs", () => {
  it("links a tag's page, keeping a nested tag's slash readable", () => {
    expect(editorTagHref("release")).toBe("/editor/tags?tag=release");
    expect(editorTagHref("project/alpha")).toBe("/editor/tags?tag=project/alpha");
  });

  it("links a note, and the draft as the bare editor", () => {
    expect(editorFileHref("projects/roadmap.md")).toBe("/editor?file=projects/roadmap.md");
    expect(editorFileHref("draft")).toBe("/editor");
  });
});
