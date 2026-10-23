// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@/app/atoms/metadata";
import { buildFrontmatterVocabulary, COMMON_KEYS, frontmatterVocabularyOf } from "./frontmatter-vocabulary";

const note = (frontmatter: Record<string, unknown>, tags: string[] = []) =>
  ({ path: "n.md", name: "n.md", tags, frontmatter }) as unknown as FileMetadata;

describe("buildFrontmatterVocabulary", () => {
  const files = [
    note({ title: "Plan", status: "draft", priority: "high", created: "2026-10-01" }, ["work", "ideas"]),
    note({ status: "draft", description: "A longer sentence here." }, ["work"]),
    note({ status: "done", owner: "release-team" }, ["writing"]),
    note({ private: "true", status: "secret", codename: "x" }, ["hidden"]),
  ];
  const vocabulary = buildFrontmatterVocabulary(files);

  it("lists the common keys, then the vault's other keys most used first", () => {
    expect(vocabulary.keys.slice(0, COMMON_KEYS.length)).toEqual(COMMON_KEYS);
    expect(vocabulary.keys.slice(COMMON_KEYS.length)).toEqual(["owner", "priority"]);
  });

  it("ranks tags by use", () => {
    expect(vocabulary.tags).toEqual(["work", "ideas", "writing"]);
  });

  it("keeps short repeated values, not free text or dates", () => {
    expect(vocabulary.values.status).toEqual(["draft", "done"]);
    expect(vocabulary.values.priority).toEqual(["high"]);
    expect(vocabulary.values.created).toBeUndefined();
    expect(vocabulary.values.title).toBeUndefined();
    expect(vocabulary.values.description).toBeUndefined();
  });

  it("leaves out private notes", () => {
    expect(vocabulary.tags).not.toContain("hidden");
    expect(vocabulary.keys).not.toContain("codename");
    expect(vocabulary.values.status).not.toContain("secret");
  });
});

describe("frontmatterVocabularyOf", () => {
  it("builds once per index", () => {
    const index = { "n.md": note({ status: "draft" }) };
    expect(frontmatterVocabularyOf(index)).toBe(frontmatterVocabularyOf(index));
  });
});
