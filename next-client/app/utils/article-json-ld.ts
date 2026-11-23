import { SITE_URL } from "@/app/tools/content/tools";

// Structured data for a documentation article or a guide. Pair it with
// breadcrumbJsonLd() (app/tools/components/tool-json-ld.ts).
export function techArticleJsonLd({
  path,
  title,
  description,
  section,
}: {
  path: string;
  title: string;
  description: string;
  section: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    articleSection: section,
    url: `${SITE_URL}${path}`,
    mainEntityOfPage: `${SITE_URL}${path}`,
    inLanguage: "en",
    author: { "@type": "Person", name: "Mares Popa", url: "https://www.marespopa.com/" },
    publisher: { "@type": "Organization", name: "HermesMarkdown", url: SITE_URL },
  };
}
