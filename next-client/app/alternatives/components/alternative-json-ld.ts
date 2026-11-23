import { breadcrumbJsonLd } from "@/app/tools/components/tool-json-ld";
import { alternativePath, type AlternativeEntry } from "../content/types";

// Structured data for an alternative page: its breadcrumb and its FAQ.
export function alternativeJsonLd(entry: AlternativeEntry) {
  return [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Alternatives", path: "/alternatives" },
      { name: entry.competitor, path: alternativePath(entry) },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: entry.faq.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];
}
