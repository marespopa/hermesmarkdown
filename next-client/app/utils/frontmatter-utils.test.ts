import { describe, it, expect } from "vitest";
import { getAllScopes, parseFmFields, updateFmFields, FM_REGEX } from "./frontmatter-utils";
import type { FileMetadata } from "@/app/atoms/metadata";

function makeMeta(path: string, scope: string | undefined, modifiedAt: number): FileMetadata {
  return {
    path,
    name: path,
    tags: [],
    links: [],
    frontmatter: scope !== undefined ? { scope } : {},
    modifiedAt,
    wordCount: 0,
    handle: null,
  };
}

describe("getAllScopes", () => {
  it("returns unique scopes, most-recently-modified first", () => {
    const metadata: Record<string, FileMetadata> = {
      "a.md": makeMeta("a.md", "Billing", 100),
      "b.md": makeMeta("b.md", "Auth", 200),
      "c.md": makeMeta("c.md", "Billing", 50),
    };
    expect(getAllScopes(metadata)).toEqual(["Auth", "Billing"]);
  });

  it("ignores files with no scope", () => {
    const metadata: Record<string, FileMetadata> = {
      "a.md": makeMeta("a.md", undefined, 100),
      "b.md": makeMeta("b.md", "", 50),
    };
    expect(getAllScopes(metadata)).toEqual([]);
  });
});

describe("parseFmFields / updateFmFields round trip", () => {
  it("parses and re-serializes a frontmatter block without losing unknown fields", () => {
    const content = '---\ntitle: "Hello"\nstatus: draft\ncustom_field: "kept"\n---\n\nBody text';
    const fields = parseFmFields(content);
    expect(fields.title).toBe("Hello");
    expect(fields.custom_field).toBe("kept");

    const updated = updateFmFields(content, { title: "Updated" });
    expect(FM_REGEX.test(updated)).toBe(true);
    expect(parseFmFields(updated).title).toBe("Updated");
    expect(parseFmFields(updated).custom_field).toBe("kept");
    expect(updated).toContain("Body text");
  });
});
