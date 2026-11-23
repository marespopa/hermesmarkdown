import type { Metadata } from "next";
import LandingPage from "./components/LandingPage/LandingPage";
import { LANDING_FAQ } from "./components/LandingPage/landing-content";
import { serializeJsonLd } from "./utils/json-ld";
import { HOME_TITLE, SITE_DESCRIPTION, pageMetadata } from "./utils/page-metadata";
import { SITE_URL } from "./tools/content/tools";

export const metadata: Metadata = pageMetadata({ path: "/", title: HOME_TITLE, description: SITE_DESCRIPTION });

const SOFTWARE_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "HermesMarkdown",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "HermesMarkdown is a minimal, local-first Markdown editor that runs entirely in your browser and works offline. It reads/writes files directly on disk, or keeps them in a browser vault where folder access isn't available (Safari, Firefox, iOS). No accounts, no cloud sync. It is unrelated to Hermes Agent's SOUL.md, memory.md, or plan-mode files.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  sameAs: ["https://github.com/marespopa/hermesmarkdown"],
};

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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(SOFTWARE_APPLICATION_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(FAQ_JSON_LD) }}
      />
      <LandingPage />
    </>
  );
}
