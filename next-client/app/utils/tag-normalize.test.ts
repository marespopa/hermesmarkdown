// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normalizeTag } from "./tag-normalize";

describe("normalizeTag", () => {
  it("drops a leading # and lowercases", () => {
    expect(normalizeTag("#Release")).toBe("release");
  });

  it("trims whitespace and surrounding quotes", () => {
    expect(normalizeTag(`  "bug"  `)).toBe("bug");
    expect(normalizeTag("'status'")).toBe("status");
  });

  it("keeps a nested tag's slashes", () => {
    expect(normalizeTag("Project/Alpha")).toBe("project/alpha");
  });
});
