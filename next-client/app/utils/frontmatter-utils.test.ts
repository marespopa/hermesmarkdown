// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseFmFields, updateFmFields, FM_REGEX } from "./frontmatter-utils";

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

describe("updateFmFields removal", () => {
  it("removes a field and its continuation lines when the value is null", () => {
    const content = '---\ntitle: "Hello"\ntags:\n  - a\n  - b\nstatus: draft\n---\nBody';
    expect(updateFmFields(content, { tags: null })).toBe('---\ntitle: "Hello"\nstatus: draft\n---\nBody');
  });

  it("never adds a null field that isn't there", () => {
    expect(updateFmFields('---\ntitle: "Hello"\n---\nBody', { missing: null })).toBe('---\ntitle: "Hello"\n---\nBody');
    expect(updateFmFields("Body", { missing: null })).toBe("Body");
  });
});
