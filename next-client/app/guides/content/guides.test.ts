import { describe, expect, it } from "vitest";
import { findArticle } from "@/app/documentation/content/lookup";
import { serializeJsonLd } from "@/app/utils/json-ld";
import { guideJsonLd } from "../components/guide-json-ld";
import { GUIDES, guideBySlug, guidePath } from "./index";

describe("guides catalog", () => {
  it("has unique, URL-safe slugs and complete copy", () => {
    expect(new Set(GUIDES.map((entry) => entry.slug)).size).toBe(GUIDES.length);
    for (const entry of GUIDES) {
      expect(entry.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(entry.title.length).toBeLessThanOrEqual(70);
      expect(entry.description.length).toBeGreaterThanOrEqual(70);
      expect(entry.description.length).toBeLessThanOrEqual(170);
      expect(entry.sections.length).toBeGreaterThanOrEqual(3);
      for (const section of entry.sections) expect(section.body.length).toBeGreaterThan(0);
      expect(entry.faq.length).toBeGreaterThanOrEqual(5);
      expect(entry.related.length).toBeGreaterThan(0);
    }
  });

  it("links only to documentation articles that exist", () => {
    for (const entry of GUIDES) {
      expect(entry.docs.length).toBeGreaterThan(0);
      for (const id of entry.docs) expect(findArticle(id), `${entry.slug}: ${id}`).toBeDefined();
    }
  });

  it("serves each entry at its own path", () => {
    for (const entry of GUIDES) {
      expect(guidePath(entry)).toBe(`/guides/${entry.slug}`);
      expect(guideBySlug(entry.slug)).toBe(entry);
    }
  });

  it("outputs the article, breadcrumb and FAQ, with < escaped", () => {
    const entry = GUIDES[0];
    const json = serializeJsonLd(guideJsonLd(entry));
    expect(json).toContain("TechArticle");
    expect(json).toContain("BreadcrumbList");
    expect(json).toContain(entry.faq[0].q);
    const withMarkup = { ...entry, faq: [{ q: "A </script> question?", a: "An answer." }] };
    expect(serializeJsonLd(guideJsonLd(withMarkup))).not.toContain("<");
  });
});
