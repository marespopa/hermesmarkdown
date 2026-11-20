import TextLink from "@/app/components/TextLink/TextLink.component";
import { LANDING_FAQ } from "./landing-content";
import { H2, SECTION } from "./landing-styles";

/** The FAQ, each answer folded under its question (native details, so it opens by keyboard), and the guide links. */
export default function LandingFaq() {
  return (
    <section className={SECTION} aria-labelledby="landing-faq">
      <div className="mx-auto w-full max-w-3xl">
        <h2 id="landing-faq" className={H2}>
          Questions
        </h2>
        <div className="mt-12 border-t border-edge-subtle">
          {LANDING_FAQ.map(({ q, a }) => (
            <details key={q} className="group border-b border-edge-subtle">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  aria-hidden="true"
                  className="text-xl font-normal text-fg-muted transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 leading-relaxed text-fg-muted">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-10 text-ui-footnote text-fg-muted">
          New to Markdown? Read <TextLink href="/markdown-editor">what a Markdown editor is</TextLink>, try the{" "}
          <TextLink href="/tools">free Markdown tools</TextLink>, or browse the{" "}
          <TextLink href="/documentation">documentation</TextLink>.
        </p>
      </div>
    </section>
  );
}
