import LandingPage from "./components/LandingPage/LandingPage";
import { LANDING_FAQ } from "./components/LandingPage/landing-content";
import { serializeJsonLd } from "./tools/components/tool-json-ld";

// Same questions and answers as the FAQ section on the page.
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function AppPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(FAQ_JSON_LD) }}
      />
      <LandingPage />
    </>
  );
}
