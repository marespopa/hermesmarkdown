import type { Metadata } from "next";
import PageHero from "@/app/components/PageHero/PageHero";
import TextLink from "@/app/components/TextLink";
import { breadcrumbJsonLd } from "@/app/tools/components/tool-json-ld";
import { serializeJsonLd } from "@/app/utils/json-ld";
import { pageMetadata } from "@/app/utils/page-metadata";
import { ALTERNATIVES, alternativePath } from "./content";

const DESCRIPTION =
  "How HermesMarkdown, a local-first Markdown editor in your browser, compares with Typora, Obsidian, Dillinger and StackEdit: where files live, what runs offline, and what it costs.";

export const metadata: Metadata = pageMetadata({
  path: "/alternatives",
  title: "Markdown Editor Alternatives | HermesMarkdown",
  description: DESCRIPTION,
});

// /alternatives: a link to each comparison page.
export default function AlternativesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Alternatives", path: "/alternatives" },
  ]);
  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-28 space-y-14">
        <PageHero title="Alternatives" intro="Other Markdown editors, and how HermesMarkdown differs from each." />
        <ul className="grid gap-4 sm:grid-cols-2">
          {ALTERNATIVES.map((entry) => (
            <li key={entry.slug}>
              <TextLink
                href={alternativePath(entry)}
                variant="unstyled"
                className="flex h-full flex-col gap-2 rounded-xl border border-edge-subtle bg-surface-raised p-6 transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
              >
                <span className="text-ui-title-3 font-semibold text-fg">vs {entry.competitor}</span>
                <span className="text-ui-subhead text-fg-muted">{entry.lead}</span>
              </TextLink>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
