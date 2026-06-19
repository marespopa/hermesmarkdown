import { describe, it, expect } from "vitest";
import { resolveTier } from "./tier-resolver";
import { VaultIndexEntry } from "./vault-index-reader";

function entry(overrides: Partial<VaultIndexEntry> = {}): VaultIndexEntry {
  return {
    path: "file.md",
    title: "File",
    status: "active",
    scope: null,
    read_when: [],
    related: [],
    tags: [],
    ...overrides,
  };
}

describe("resolveTier", () => {
  it("skips when read_when is empty", () => {
    const result = resolveTier(entry(), "anything");
    expect(result.tier).toBe("skip");
    expect(result.reason).toMatch(/no read_when set/);
  });

  it("skips unconditionally when read_when contains never", () => {
    const result = resolveTier(entry({ read_when: ["never"] }), "anything");
    expect(result.tier).toBe("skip");
    expect(result.reason).toMatch(/never/);
  });

  it("matches always regardless of query", () => {
    const result = resolveTier(entry({ read_when: ["always"], scope: "summary" }), "");
    expect(result.tier).toBe("scope-only");
    expect(result.reason).toMatch(/always/);
  });

  it("skips when no query is provided and read_when has no always/never", () => {
    const result = resolveTier(entry({ read_when: ["keywords: billing, invoice"] }), "");
    expect(result.tier).toBe("skip");
    expect(result.reason).toMatch(/no query provided/);
  });

  it("matches a keyword entry against the query", () => {
    const result = resolveTier(
      entry({ read_when: ["keywords: billing, invoice"], scope: "summary" }),
      "I have a billing question",
    );
    expect(result.tier).toBe("scope-only");
    expect(result.reason).toMatch(/keyword "billing"/);
  });

  it("does not match a keyword entry when query doesn't contain it", () => {
    const result = resolveTier(entry({ read_when: ["keywords: billing, invoice"] }), "weather forecast");
    expect(result.tier).toBe("skip");
  });

  it("matches a sentence entry via word overlap with the query", () => {
    const result = resolveTier(
      entry({ read_when: ["user is asking about quarterly revenue"] }),
      "what was quarterly revenue last year",
    );
    expect(result.tier).toBe("full");
    expect(result.reason).toMatch(/overlaps read_when/);
  });

  it("resolves to scope-only when matched and scope is present", () => {
    const result = resolveTier(
      entry({ read_when: ["always"], scope: "one line summary" }),
      "",
    );
    expect(result.tier).toBe("scope-only");
  });

  it("resolves to full when matched and scope is missing", () => {
    const result = resolveTier(entry({ read_when: ["always"], scope: null }), "");
    expect(result.tier).toBe("full");
    expect(result.reason).toMatch(/no scope field/);
  });
});
