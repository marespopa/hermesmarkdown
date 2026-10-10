import { describe, expect, it } from "vitest";
import { serializeJsonLd, toolJsonLd } from "../components/tool-json-ld";
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
