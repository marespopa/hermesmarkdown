import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/app/utils/json-ld";
import { alternativeJsonLd } from "../components/alternative-json-ld";
import { ALTERNATIVES, alternativeBySlug, alternativePath } from "./index";

describe("alternatives catalog", () => {
  it("has unique, URL-safe slugs and complete copy", () => {
    expect(new Set(ALTERNATIVES.map((entry) => entry.slug)).size).toBe(ALTERNATIVES.length);
    for (const entry of ALTERNATIVES) {
      expect(entry.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(entry.title.length).toBeLessThanOrEqual(70);
      expect(entry.description.length).toBeGreaterThanOrEqual(70);
      expect(entry.description.length).toBeLessThanOrEqual(170);
      expect(entry.keywords.length).toBeGreaterThan(0);
      expect(entry.whySwitch.length).toBeGreaterThanOrEqual(3);
      expect(entry.comparison.length).toBeGreaterThanOrEqual(3);
      expect(entry.faq.length).toBeGreaterThanOrEqual(5);
      expect(entry.related.length).toBeGreaterThan(0);
    }
  });

  it("serves each entry at its own path", () => {
    for (const entry of ALTERNATIVES) {
      expect(alternativePath(entry)).toBe(`/alternatives/${entry.slug}`);
      expect(alternativeBySlug(entry.slug)).toBe(entry);
    }
    expect(alternativeBySlug("nope")).toBeUndefined();
  });

  it("puts the FAQ and breadcrumb into structured data, with < escaped", () => {
    const entry = ALTERNATIVES[0];
    const json = serializeJsonLd(alternativeJsonLd(entry));
    expect(json).toContain(entry.faq[0].q);
    expect(json).toContain("BreadcrumbList");
    const withMarkup = { ...entry, faq: [{ q: "A </script> question?", a: "An answer." }] };
    expect(serializeJsonLd(alternativeJsonLd(withMarkup))).not.toContain("<");
  });
});
