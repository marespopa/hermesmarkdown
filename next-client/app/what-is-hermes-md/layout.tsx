import { Metadata } from "next";

export const metadata: Metadata = {
  title: "What is a hermes.md file? — HermesMarkdown",
  description:
    "hermes.md and .hermes.md are project-context files used by Hermes Agent (NousResearch) — not a HermesMarkdown format. Plain-language explanation of the convention and how it differs from HermesMarkdown's vault system.",
  alternates: { canonical: "/what-is-hermes-md" },
  openGraph: {
    title: "What is a hermes.md file?",
    description:
      "hermes.md and .hermes.md are project-context files used by Hermes Agent (NousResearch). Not a HermesMarkdown format — here's what they actually are.",
    url: "https://hermesmarkdown.com/what-is-hermes-md",
    siteName: "HermesMarkdown",
    type: "article",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "What is a hermes.md file?",
    description:
      "hermes.md and .hermes.md are project-context files used by Hermes Agent (NousResearch). Plain-language explanation.",
    images: ["/assets/og-image.jpg"],
  },
};

export default function WhatIsHermesMdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
