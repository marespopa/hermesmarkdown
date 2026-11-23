import type { AlternativeEntry } from "../content/types";
import { alternativeJsonLd } from "./alternative-json-ld";
import { serializeJsonLd } from "@/app/utils/json-ld";
import PageHero from "@/app/components/PageHero/PageHero";
import TextLink from "@/app/components/TextLink";

const SECTION = "space-y-6 border-t border-edge-subtle pt-14";
const H2 = "text-2xl md:text-3xl font-bold tracking-tight";
const MUTED = "text-fg-muted leading-relaxed";

// The page for one alternative: breadcrumb, title, comparison table, why
// switch, a call to open the editor, the FAQ and related links. A server
// component; the FAQ text is the same as the FAQPage structured data.
export default function AlternativeShell({ entry }: { entry: AlternativeEntry }) {
  return (
    <main className="selection:bg-sage/30 overflow-x-hidden font-sans">
      {alternativeJsonLd(entry).map((data, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
      ))}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-28 space-y-14">
        <header className="space-y-4">
          <nav aria-label="Breadcrumb" className="text-ui-footnote text-fg-muted">
            <ol className="flex items-center gap-2">
              <li><TextLink href="/alternatives" variant="quiet">Alternatives</TextLink></li>
              <li aria-hidden="true">›</li>
              <li aria-current="page" className="text-fg">{entry.competitor}</li>
            </ol>
          </nav>
          <PageHero title={`HermesMarkdown vs ${entry.competitor}`} intro={entry.lead} />
        </header>

        <section className={SECTION} aria-labelledby="comparison-title">
          <h2 id="comparison-title" className={H2}>How they compare</h2>
          <div className="overflow-x-auto rounded-xl border border-edge-subtle">
            <table className="w-full text-left text-ui-subhead">
              <thead className="bg-chrome">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Feature</span></th>
                  <th scope="col" className="px-4 py-3 font-semibold">HermesMarkdown</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{entry.competitor}</th>
                </tr>
              </thead>
              <tbody>
                {entry.comparison.map((row) => (
                  <tr key={row.feature} className="border-t border-edge-subtle align-top">
                    <th scope="row" className="px-4 py-3 font-semibold">{row.feature}</th>
                    <td className="px-4 py-3 text-fg-muted">{row.hermes}</td>
                    <td className="px-4 py-3 text-fg-muted">{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-ui-footnote text-fg-muted">
            {entry.competitor} is a separate product and is not affiliated with HermesMarkdown. Check its own site for its current features.
          </p>
        </section>

        <section className={SECTION}>
          <h2 className={H2}>Why switch</h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {entry.whySwitch.map((reason) => (
              <li key={reason.title} className="space-y-2">
                <h3 className="font-bold text-lg">{reason.title}</h3>
                <p className={MUTED}>{reason.body}</p>
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
          <h2 className={H2}>Related tools and guides</h2>
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
