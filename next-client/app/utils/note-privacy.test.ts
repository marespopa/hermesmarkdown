// @vitest-environment node
import { describe, expect, it } from "vitest";
import { clearSensitiveMarkers, isSensitiveContent, isSensitiveFrontmatter } from "./note-privacy";

const note = (frontmatter: string, body = "Body text") => `---\n${frontmatter}\n---\n\n${body}`;

describe("isSensitiveContent", () => {
  it("accepts sensitive: true in any case, quoted or not", () => {
    expect(isSensitiveContent(note("sensitive: true"))).toBe(true);
    expect(isSensitiveContent(note('sensitive: "true"'))).toBe(true);
    expect(isSensitiveContent(note("sensitive: TRUE"))).toBe(true);
  });

  it("accepts private: true like sensitive: true", () => {
    expect(isSensitiveContent(note("private: true"))).toBe(true);
    expect(isSensitiveContent(note("private: false"))).toBe(false);
  });

  it("is false for sensitive: false or a missing key", () => {
    expect(isSensitiveContent(note("sensitive: false"))).toBe(false);
    expect(isSensitiveContent(note("title: Plan"))).toBe(false);
  });

  it("accepts a private or sensitive tag in a flow list, block list or scalar", () => {
    expect(isSensitiveContent(note("tags: [work, private]"))).toBe(true);
    expect(isSensitiveContent(note("tags:\n  - work\n  - '#Sensitive'"))).toBe(true);
    expect(isSensitiveContent(note("tags: private"))).toBe(true);
    expect(isSensitiveContent(note('tags: [work, "private"]'))).toBe(true);
    expect(isSensitiveContent(note("tags: [#Sensitive]"))).toBe(true);
    expect(isSensitiveContent(note("tags: [privacy, work]"))).toBe(false);
  });

  it("ignores inline body hashtags", () => {
    expect(isSensitiveContent(note("title: Plan", "Some #private thoughts"))).toBe(false);
    expect(isSensitiveContent("# Plan\n\nSome #private thoughts")).toBe(false);
  });

  it("is false for a note without frontmatter", () => {
    expect(isSensitiveContent("sensitive: true")).toBe(false);
    expect(isSensitiveContent("")).toBe(false);
  });

  it("lets any positive marker win", () => {
    expect(isSensitiveContent(note("sensitive: false\ntags: [private]"))).toBe(true);
  });
});

describe("isSensitiveFrontmatter", () => {
  it("handles undefined, booleans and tag arrays", () => {
    expect(isSensitiveFrontmatter(undefined)).toBe(false);
    expect(isSensitiveFrontmatter({ sensitive: true })).toBe(true);
    expect(isSensitiveFrontmatter({ tags: ["work", "#Private"] })).toBe(true);
    expect(isSensitiveFrontmatter({ tags: "a, private" })).toBe(true);
    expect(isSensitiveFrontmatter({ tags: "a, b" })).toBe(false);
  });
});

describe("clearSensitiveMarkers", () => {
  it("removes the sensitive / private flags and keeps other fields", () => {
    expect(clearSensitiveMarkers(note('title: "A"\nsensitive: true\nprivate: true'))).toBe(note('title: "A"'));
  });

  it("drops only the sensitive / private tags, and the tags key when empty", () => {
    expect(clearSensitiveMarkers(note("tags: [finance, Private, sensitive]"))).toBe(note("tags: [finance]"));
    expect(clearSensitiveMarkers(note('title: "A"\ntags: [private]'))).toBe(note('title: "A"'));
  });

  it("leaves notes without markers or frontmatter untouched", () => {
    const plain = note("tags:\n  - work");
    expect(clearSensitiveMarkers(plain)).toBe(plain);
    expect(clearSensitiveMarkers("Body")).toBe("Body");
  });

  it("leaves no marker behind", () => {
    const cleared = clearSensitiveMarkers(note("sensitive: true\ntags: [a, private]\nprivate: TRUE"));
    expect(isSensitiveContent(cleared)).toBe(false);
  });
});
