// @vitest-environment node
import { describe, expect, it } from "vitest";
import { clearSensitiveMarkers, isSensitiveContent, isSensitiveFrontmatter } from "./note-privacy";

const note = (frontmatter: string, body = "Body text") => `---\n${frontmatter}\n---\n\n${body}`;

describe("isSensitiveContent (private notes)", () => {
  it("accepts private: true in any case, quoted or not", () => {
    expect(isSensitiveContent(note("private: true"))).toBe(true);
    expect(isSensitiveContent(note('private: "true"'))).toBe(true);
    expect(isSensitiveContent(note("private: TRUE"))).toBe(true);
  });

  it("is false for private: false or a missing key", () => {
    expect(isSensitiveContent(note("private: false"))).toBe(false);
    expect(isSensitiveContent(note("title: Plan"))).toBe(false);
  });

  it("accepts a private tag in a flow list, block list or scalar", () => {
    expect(isSensitiveContent(note("tags: [work, private]"))).toBe(true);
    expect(isSensitiveContent(note("tags:\n  - work\n  - '#Private'"))).toBe(true);
    expect(isSensitiveContent(note("tags: private"))).toBe(true);
    expect(isSensitiveContent(note('tags: [work, "private"]'))).toBe(true);
    expect(isSensitiveContent(note("tags: [#Private]"))).toBe(true);
    expect(isSensitiveContent(note("tags: [privacy, work]"))).toBe(false);
  });

  it("doesn't treat the retired sensitive marker as private", () => {
    expect(isSensitiveContent(note("sensitive: true"))).toBe(false);
    expect(isSensitiveContent(note("tags: [sensitive]"))).toBe(false);
  });

  it("ignores inline body hashtags", () => {
    expect(isSensitiveContent(note("title: Plan", "Some #private thoughts"))).toBe(false);
    expect(isSensitiveContent("# Plan\n\nSome #private thoughts")).toBe(false);
  });

  it("is false for a note without frontmatter", () => {
    expect(isSensitiveContent("private: true")).toBe(false);
    expect(isSensitiveContent("")).toBe(false);
  });

  it("lets either spelling of the marker win", () => {
    expect(isSensitiveContent(note("private: false\ntags: [private]"))).toBe(true);
  });
});

describe("isSensitiveFrontmatter (private notes)", () => {
  it("handles undefined, booleans and tag arrays", () => {
    expect(isSensitiveFrontmatter(undefined)).toBe(false);
    expect(isSensitiveFrontmatter({ private: true })).toBe(true);
    expect(isSensitiveFrontmatter({ sensitive: true })).toBe(false);
    expect(isSensitiveFrontmatter({ tags: ["work", "#Private"] })).toBe(true);
    expect(isSensitiveFrontmatter({ tags: "a, private" })).toBe(true);
    expect(isSensitiveFrontmatter({ tags: "a, b" })).toBe(false);
  });
});

describe("clearSensitiveMarkers", () => {
  it("removes the private flag and keeps other fields", () => {
    expect(clearSensitiveMarkers(note('title: "A"\nprivate: true'))).toBe(note('title: "A"'));
  });

  it("drops only the private tag, and the tags key when empty", () => {
    expect(clearSensitiveMarkers(note("tags: [finance, Private]"))).toBe(note("tags: [finance]"));
    expect(clearSensitiveMarkers(note('title: "A"\ntags: [private]'))).toBe(note('title: "A"'));
  });

  it("leaves notes without the marker or frontmatter untouched", () => {
    const plain = note("tags:\n  - work");
    expect(clearSensitiveMarkers(plain)).toBe(plain);
    expect(clearSensitiveMarkers("Body")).toBe("Body");
  });

  it("leaves no marker behind", () => {
    const cleared = clearSensitiveMarkers(note("tags: [a, private]\nprivate: TRUE"));
    expect(isSensitiveContent(cleared)).toBe(false);
  });
});
