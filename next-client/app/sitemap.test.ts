import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists the tools hub and each tool once", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://hermesmarkdown.com/tools");
    expect(urls).toContain("https://hermesmarkdown.com/tools/tokenizer");
    expect(urls).toContain("https://hermesmarkdown.com/tools/markdown-table-generator");
    expect(urls).toContain("https://hermesmarkdown.com/tools/mermaid-in-markdown");
    expect(urls).toContain("https://hermesmarkdown.com/tools/markdown-cleaner");
    expect(new Set(urls).size).toBe(urls.length);
  });
});
