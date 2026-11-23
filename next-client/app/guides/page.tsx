import type { Metadata } from "next";
import PageHero from "@/app/components/PageHero/PageHero";
import TextLink from "@/app/components/TextLink";
import { breadcrumbJsonLd } from "@/app/tools/components/tool-json-ld";
import { serializeJsonLd } from "@/app/utils/json-ld";
import { pageMetadata } from "@/app/utils/page-metadata";
import { GUIDES, guideHeadline, guidePath } from "./content";

const DESCRIPTION =
  "How-to guides for HermesMarkdown: edit an Obsidian vault in the browser, write Markdown offline on a Chromebook or tablet, and use a local Ollama model for AI.";

export const metadata: Metadata = pageMetadata({
  path: "/guides",
  title: "Markdown Editor Guides | HermesMarkdown",
  description: DESCRIPTION,
});

// /guides: a link to each guide.
export default function GuidesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
  ]);
  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-28 space-y-14">
        <PageHero title="Guides" intro="Step-by-step help for common ways of using HermesMarkdown." />
        <ul className="grid gap-4 sm:grid-cols-2">
          {GUIDES.map((entry) => (
            <li key={entry.slug}>
              <TextLink
                href={guidePath(entry)}
                variant="unstyled"
                className="flex h-full flex-col gap-2 rounded-xl border border-edge-subtle bg-surface-raised p-6 transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
              >
                <span className="text-ui-title-3 font-semibold text-fg">{guideHeadline(entry)}</span>
                <span className="text-ui-subhead text-fg-muted">{entry.lead}</span>
              </TextLink>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
