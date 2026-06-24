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
