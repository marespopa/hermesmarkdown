import type { RefObject } from "react";
import Button from "@/app/components/Button/Button.component";
import TextLink from "@/app/components/TextLink/TextLink.component";
import LandingLoop from "./LandingLoop";
import { LANDING_HEADLINE, LANDING_SUBLINE } from "./landing-content";
import { DISPLAY } from "./landing-styles";

/**
 * The first screen: wordmark, one headline, one line, one call to action and
 * a quiet docs link, centred; under them the editor typing a note, wide, as
 * the page's centrepiece.
 */
export default function LandingHero({ ctaRef, onStart }: { ctaRef: RefObject<HTMLDivElement | null>; onStart: () => void }) {
  return (
    // The small viewport height, so a phone browser's bars don't cut it off.
    <section className="container max-w-screen-xl flex min-h-svh flex-col items-center pb-20 pt-14 text-center sm:pt-20 lg:pt-28">
      <p className="text-ui-footnote font-semibold uppercase tracking-[0.3em] text-fg-muted">HermesMarkdown</p>
      <h1 className={`mt-6 max-w-4xl ${DISPLAY}`}>{LANDING_HEADLINE}</h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-muted md:text-xl">{LANDING_SUBLINE}</p>
      <div ref={ctaRef} className="mt-10 flex flex-col items-center gap-5 sm:flex-row">
        <Button variant="hero" onClick={onStart} className="px-10">
          Start writing
        </Button>
        <TextLink
          href="/documentation"
          variant="unstyled"
          className="inline-flex items-center gap-1.5 text-ui-callout font-semibold text-fg-muted transition-colors hover:text-fg"
        >
          Read the docs <span aria-hidden="true">→</span>
        </TextLink>
      </div>
      <div className="mt-16 w-full max-w-5xl sm:mt-20">
        <LandingLoop />
      </div>
    </section>
  );
}
