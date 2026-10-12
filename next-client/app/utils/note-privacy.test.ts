// @vitest-environment node
import { describe, expect, it } from "vitest";
import { clearPrivateMarkers, isPrivateContent, isPrivateFrontmatter } from "./note-privacy";

const note = (frontmatter: string, body = "Body text") => `---\n${frontmatter}\n---\n\n${body}`;

describe("isPrivateContent", () => {
  it("accepts private: true in any case, quoted or not", () => {
    expect(isPrivateContent(note("private: true"))).toBe(true);
    expect(isPrivateContent(note('private: "true"'))).toBe(true);
    expect(isPrivateContent(note("private: TRUE"))).toBe(true);
  });

  it("is false for private: false or a missing key", () => {
    expect(isPrivateContent(note("private: false"))).toBe(false);
    expect(isPrivateContent(note("title: Plan"))).toBe(false);
  });

  it("accepts a private tag in a flow list, block list or scalar", () => {
    expect(isPrivateContent(note("tags: [work, private]"))).toBe(true);
    expect(isPrivateContent(note("tags:\n  - work\n  - '#Private'"))).toBe(true);
    expect(isPrivateContent(note("tags: private"))).toBe(true);
    expect(isPrivateContent(note('tags: [work, "private"]'))).toBe(true);
    expect(isPrivateContent(note("tags: [#Private]"))).toBe(true);
    expect(isPrivateContent(note("tags: [privacy, work]"))).toBe(false);
  });

  it("doesn't treat the retired sensitive marker as private", () => {
    expect(isPrivateContent(note("sensitive: true"))).toBe(false);
    expect(isPrivateContent(note("tags: [sensitive]"))).toBe(false);
  });

  it("ignores inline body hashtags", () => {
    expect(isPrivateContent(note("title: Plan", "Some #private thoughts"))).toBe(false);
    expect(isPrivateContent("# Plan\n\nSome #private thoughts")).toBe(false);
  });

  it("is false for a note without frontmatter", () => {
    expect(isPrivateContent("private: true")).toBe(false);
    expect(isPrivateContent("")).toBe(false);
  });

  it("lets either spelling of the marker win", () => {
    expect(isPrivateContent(note("private: false\ntags: [private]"))).toBe(true);
  });
});

describe("isPrivateFrontmatter", () => {
  it("handles undefined, booleans and tag arrays", () => {
    expect(isPrivateFrontmatter(undefined)).toBe(false);
    expect(isPrivateFrontmatter({ private: true })).toBe(true);
    expect(isPrivateFrontmatter({ sensitive: true })).toBe(false);
    expect(isPrivateFrontmatter({ tags: ["work", "#Private"] })).toBe(true);
    expect(isPrivateFrontmatter({ tags: "a, private" })).toBe(true);
    expect(isPrivateFrontmatter({ tags: "a, b" })).toBe(false);
  });
});

describe("clearPrivateMarkers", () => {
  it("removes the private flag and keeps other fields", () => {
    expect(clearPrivateMarkers(note('title: "A"\nprivate: true'))).toBe(note('title: "A"'));
  });

  it("drops only the private tag, and the tags key when empty", () => {
    expect(clearPrivateMarkers(note("tags: [finance, Private]"))).toBe(note("tags: [finance]"));
    expect(clearPrivateMarkers(note('title: "A"\ntags: [private]'))).toBe(note('title: "A"'));
  });

  it("leaves notes without the marker or frontmatter untouched", () => {
    const plain = note("tags:\n  - work");
    expect(clearPrivateMarkers(plain)).toBe(plain);
    expect(clearPrivateMarkers("Body")).toBe("Body");
  });

  it("leaves no marker behind", () => {
    const cleared = clearPrivateMarkers(note("tags: [a, private]\nprivate: TRUE"));
    expect(isPrivateContent(cleared)).toBe(false);
  });
});
