import { describe, expect, it } from "vitest";
import { toolJsonLd } from "../components/tool-json-ld";
import { serializeJsonLd } from "@/app/utils/json-ld";
import { TOOLS, toolBySlug, toolMetadata } from "./tools";

describe("tool catalog", () => {
  it("has unique slugs and complete copy", () => {
    expect(new Set(TOOLS.map((tool) => tool.slug)).size).toBe(TOOLS.length);
    for (const tool of TOOLS) {
      expect(tool.faq.length).toBeGreaterThanOrEqual(4);
      expect(tool.title.length).toBeLessThanOrEqual(70);
      expect(tool.description.length).toBeGreaterThanOrEqual(70);
      expect(tool.description.length).toBeLessThanOrEqual(170);
    }
  });

  it("gives the converter pages their own copy, with at least 5 FAQs", () => {
    const slugs = ["word-to-markdown", "google-docs-to-markdown", "csv-to-markdown-table", "markdown-to-pdf"] as const;
    const cleaner = toolBySlug("markdown-cleaner");
    for (const slug of slugs) {
      const tool = toolBySlug(slug);
      expect(tool.faq.length).toBeGreaterThanOrEqual(5);
      expect(tool.features.length).toBeGreaterThanOrEqual(4);
      expect(tool.lead).not.toBe(cleaner.lead);
      const cleanerQuestions = new Set(cleaner.faq.map((entry) => entry.q));
      for (const { q } of tool.faq) expect(cleanerQuestions.has(q)).toBe(false);
    }
  });

  it("links related tools that exist, and gives every tool a pitch link", () => {
    for (const tool of TOOLS) {
      expect(tool.related?.length, tool.slug).toBeGreaterThan(0);
      for (const link of tool.related ?? []) {
        expect(TOOLS.some((entry) => entry.slug === link.slug), `${tool.slug} -> ${link.slug}`).toBe(true);
        expect(link.slug).not.toBe(tool.slug);
        expect(link.anchor.length).toBeGreaterThan(10);
      }
      expect(tool.pitchLink?.anchor.length, tool.slug).toBeGreaterThan(10);
      expect(tool.pitchLink?.href, tool.slug).toMatch(/^\//);
    }
  });

  it("sets the canonical URL to the tool's path", () => {
    expect(toolMetadata(toolBySlug("tokenizer")).alternates?.canonical).toBe("/tools/tokenizer");
  });

  it("puts the FAQ into structured data, with < escaped", () => {
    const tool = toolBySlug("tokenizer");
    const json = serializeJsonLd(toolJsonLd(tool));
    expect(json).toContain(tool.faq[0].q);
    expect(serializeJsonLd({ text: "</script>" })).not.toContain("<");
  });
});
