// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import {
  MASKED_PREVIEW,
  MASKED_TEXT,
  UNTITLED_SENSITIVE_TITLE,
  buildNoteDisplayItems,
  createNoteDisplayItem,
  maskTask,
  normalizePrivacyLevel,
  noteDisplayTitle,
} from "./note-display";

function meta(path: string, extra: Partial<FileMetadata> = {}): FileMetadata {
  return {
    path,
    name: path.split("/").pop()!,
    tags: [],
    links: [],
    frontmatter: {},
    modifiedAt: 1,
    wordCount: 0,
    tasks: [],
    preview: "Secret body",
    handle: null,
    ...extra,
  };
}

const sensitive = (path: string, extra: Partial<FileMetadata> = {}) =>
  meta(path, { frontmatter: { sensitive: "true" }, ...extra });

describe("createNoteDisplayItem", () => {
  it("passes non-sensitive notes through unchanged at every level", () => {
    for (const level of ["show_title", "blurred", "hidden"] as const) {
      expect(createNoteDisplayItem(meta("notes/Plan.md"), level)).toEqual({
        id: "notes/Plan.md",
        title: "Plan",
        preview: "Secret body",
        isSensitive: false,
        isMasked: false,
        previewStyle: "plain",
        isIndexed: true,
      });
    }
  });

  it("masks a sensitive preview in show_title", () => {
    const item = createNoteDisplayItem(sensitive("a.md"), "show_title");
    expect(item).toMatchObject({ title: "a", preview: MASKED_PREVIEW, isSensitive: true, isMasked: true, previewStyle: "masked" });
  });

  it("keeps the real preview, styled blurred, in blurred", () => {
    const item = createNoteDisplayItem(sensitive("a.md"), "blurred");
    expect(item).toMatchObject({ preview: "Secret body", isSensitive: true, isMasked: false, previewStyle: "blurred" });
  });

  it("excludes sensitive notes in hidden", () => {
    expect(createNoteDisplayItem(sensitive("a.md"), "hidden")).toBeNull();
  });

  it("marks an unparsed note as not indexed and not sensitive", () => {
    const item = createNoteDisplayItem(meta("a.md", { preview: undefined }), "hidden");
    expect(item).toMatchObject({ isIndexed: false, isSensitive: false, preview: "" });
  });
});

describe("noteDisplayTitle", () => {
  it("prefers the frontmatter title, then the file name", () => {
    expect(noteDisplayTitle({ name: "a.md", frontmatter: { title: " Plan " } }, true)).toBe("Plan");
    expect(noteDisplayTitle({ name: "Weekly.md", frontmatter: {} }, true)).toBe("Weekly");
  });

  it("falls back to a generic title for an unnamed sensitive note, never body text", () => {
    expect(noteDisplayTitle({ name: "", frontmatter: {} }, true)).toBe(UNTITLED_SENSITIVE_TITLE);
    expect(noteDisplayTitle({ name: ".md", frontmatter: { title: "  " } }, true)).toBe(UNTITLED_SENSITIVE_TITLE);
    expect(noteDisplayTitle({ name: "", frontmatter: {} }, false)).toBe("");
  });
});

describe("buildNoteDisplayItems", () => {
  it("keys items by path and leaves excluded notes out", () => {
    const items = buildNoteDisplayItems({ "a.md": meta("a.md"), "b.md": sensitive("b.md") }, "hidden");
    expect([...items.keys()]).toEqual(["a.md"]);
  });
});

describe("normalizePrivacyLevel", () => {
  it("falls back to show_title for unknown values", () => {
    expect(normalizePrivacyLevel("garbage")).toBe("show_title");
    expect(normalizePrivacyLevel(undefined)).toBe("show_title");
    expect(normalizePrivacyLevel("hidden")).toBe("hidden");
  });
});

describe("maskTask", () => {
  it("replaces the text and drops the tags, keeping the rest", () => {
    expect(maskTask({ id: "t", text: "Call the bank", tags: ["money"], line: 3 })).toEqual({
      id: "t",
      text: MASKED_TEXT,
      tags: [],
      line: 3,
    });
  });
});
