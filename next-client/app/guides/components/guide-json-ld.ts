import { breadcrumbJsonLd } from "@/app/tools/components/tool-json-ld";
import { techArticleJsonLd } from "@/app/utils/article-json-ld";
import { guideHeadline, guidePath, type GuideEntry } from "../content/types";

// Structured data for a guide: the article, its breadcrumb and its FAQ.
export function guideJsonLd(entry: GuideEntry) {
  return [
    techArticleJsonLd({ path: guidePath(entry), title: entry.title, description: entry.description, section: entry.section }),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Guides", path: "/guides" },
      { name: guideHeadline(entry), path: guidePath(entry) },
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
