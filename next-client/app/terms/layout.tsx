import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — HermesMarkdown",
  description:
    "Review HermesMarkdown's terms of service, including your responsibilities and the conditions for using our local-first Markdown editor.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: false },
  openGraph: {
    title: "Terms of Service — HermesMarkdown",
    description:
      "Review HermesMarkdown's terms of service, including your responsibilities and the conditions for using our local-first Markdown editor.",
    url: "https://hermesmarkdown.com/terms",
    siteName: "HermesMarkdown",
    type: "website",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
