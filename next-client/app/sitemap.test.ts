import { describe, expect, it } from "vitest";
import { allArticles } from "./documentation/content/lookup";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("lists the tools hub and each tool once", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://hermesmarkdown.com/tools");
    expect(urls).toContain("https://hermesmarkdown.com/tools/tokenizer");
    expect(urls).toContain("https://hermesmarkdown.com/tools/markdown-table-generator");
    expect(urls).toContain("https://hermesmarkdown.com/tools/mermaid-in-markdown");
    expect(urls).toContain("https://hermesmarkdown.com/tools/markdown-cleaner");
    for (const slug of ["word-to-markdown", "google-docs-to-markdown", "csv-to-markdown-table", "markdown-to-pdf"]) {
      expect(urls).toContain(`https://hermesmarkdown.com/tools/${slug}`);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("lists every documentation article once", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const { item } of allArticles()) {
      expect(urls.filter((url) => url === `https://hermesmarkdown.com/documentation/${item.id}`)).toHaveLength(1);
    }
  });

  it("has no trailing slash on any path", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const url of urls) expect(url.endsWith("/")).toBe(false);
  });
});
