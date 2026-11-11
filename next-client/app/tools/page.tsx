import type { Metadata } from "next";
import { TOOLS } from "./content/tools";
import ToolCard from "./components/ToolCard";
import { breadcrumbJsonLd } from "./components/tool-json-ld";
import { serializeJsonLd } from "@/app/utils/json-ld";
import PageHero from "@/app/components/PageHero/PageHero";

const DESCRIPTION =
  "Free, private tools for writing with Markdown and AI: they run in your browser, need no sign-up, and open your work in the HermesMarkdown editor.";

export const metadata: Metadata = {
  title: "Free Markdown & AI Writing Tools | HermesMarkdown",
  description: DESCRIPTION,
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "Free Markdown & AI Writing Tools",
    description: DESCRIPTION,
    url: "https://hermesmarkdown.com/tools",
    siteName: "HermesMarkdown",
    type: "website",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
};

export default function ToolsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Tools", path: "/tools" },
  ]);

  return (
    <main className="selection:bg-sage/30 font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-28 space-y-12">
        <PageHero title="Free tools" intro={DESCRIPTION} />
        <ul className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <li key={tool.slug}><ToolCard tool={tool} /></li>
          ))}
        </ul>
      </div>
    </main>
  );
}
