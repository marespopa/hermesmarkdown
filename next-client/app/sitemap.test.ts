import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists each page once and no tools pages", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://hermesmarkdown.com/documentation");
    expect(urls.some((url) => url.includes("/tools"))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
