import { describe, expect, it } from "vitest";
import { editorFileHref, editorReplaceHref, editorTagHref } from "./editor-url";

describe("editor URLs", () => {
  it("links a tag's page, keeping a nested tag's slash readable", () => {
    expect(editorTagHref("release")).toBe("/editor/tags?tag=release");
    expect(editorTagHref("project/alpha")).toBe("/editor/tags?tag=project/alpha");
  });

  it("links a note, and the draft as the bare editor", () => {
    expect(editorFileHref("projects/roadmap.md")).toBe("/editor?file=projects/roadmap.md");
    expect(editorFileHref("draft")).toBe("/editor");
  });

  it("links Replace in Files, with a Find text and Regex when given", () => {
    expect(editorReplaceHref()).toBe("/editor/replace");
    expect(editorReplaceHref("")).toBe("/editor/replace");
    expect(editorReplaceHref("notes/old name")).toBe("/editor/replace?find=notes/old+name");
    expect(editorReplaceHref("a.b", true)).toBe("/editor/replace?find=a.b&regex=1");
    expect(editorReplaceHref("a.b", false)).toBe("/editor/replace?find=a.b");
  });
});
