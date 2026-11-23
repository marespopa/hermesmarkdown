import PageHero from "@/app/components/PageHero/PageHero";
import TextLink from "@/app/components/TextLink";
import { findArticle } from "@/app/documentation/content/lookup";
import { serializeJsonLd } from "@/app/utils/json-ld";
import { guideHeadline, type GuideEntry } from "../content/types";
import { guideJsonLd } from "./guide-json-ld";

const SECTION = "space-y-6 border-t border-edge-subtle pt-14";
const H2 = "text-2xl md:text-3xl font-bold tracking-tight";
const MUTED = "text-fg-muted leading-relaxed";

// The page for one guide: breadcrumb, title, the steps, the documentation
// articles that go deeper, a call to open the editor, the FAQ and related
// links. A server component.
export default function GuideShell({ entry }: { entry: GuideEntry }) {
  const articles = entry.docs.flatMap((id) => findArticle(id)?.item ?? []);
  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans">
      {guideJsonLd(entry).map((data, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
      ))}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-28 space-y-14">
        <header className="space-y-4">
          <nav aria-label="Breadcrumb" className="text-ui-footnote text-fg-muted">
            <ol className="flex items-center gap-2">
              <li><TextLink href="/guides" variant="quiet">Guides</TextLink></li>
              <li aria-hidden="true">›</li>
              <li aria-current="page" className="text-fg">{entry.section}</li>
            </ol>
          </nav>
          <PageHero title={guideHeadline(entry)} intro={entry.lead} />
        </header>

        {entry.sections.map((section) => (
          <section key={section.heading} className={SECTION}>
            <h2 className={H2}>{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className={`max-w-2xl ${MUTED}`}>{paragraph}</p>
            ))}
          </section>
        ))}

        <section className={SECTION}>
          <h2 className={H2}>Go deeper in the documentation</h2>
          <ul className="space-y-3">
            {articles.map((article) => (
              <li key={article.id}>
                <TextLink href={`/documentation/${article.id}`} variant="quiet" className="font-semibold">{article.title}</TextLink>
                <p className="text-ui-subhead text-fg-muted">{article.lead}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={SECTION}>
          <h2 className={H2}>Try it now</h2>
          <p className={`max-w-2xl ${MUTED}`}>
            Open the editor in this tab. There is nothing to install and no account to make.
          </p>
          <TextLink
            href="/editor"
            variant="unstyled"
            className="inline-block rounded-full bg-accent px-5 py-2.5 text-ui-subhead font-medium text-white dark:text-paper-dark transition-opacity hover:opacity-90"
          >
            Open the editor
          </TextLink>
        </section>

        <section className={SECTION}>
          <h2 className={H2}>FAQ</h2>
          <div className="space-y-8">
            {entry.faq.map(({ q, a }) => (
              <div key={q} className="space-y-2">
                <h3 className="font-bold text-lg">{q}</h3>
                <p className={MUTED}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={SECTION}>
          <h2 className={H2}>Related</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {entry.related.map((link) => (
              <li key={link.href}>
                <TextLink href={link.href} variant="quiet" className="font-semibold">{link.label}</TextLink>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
