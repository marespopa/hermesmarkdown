import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — HermesMarkdown",
  description: "Terms of service for HermesMarkdown.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: false },
  openGraph: {
    title: "Terms of Service — HermesMarkdown",
    description: "Terms of service for HermesMarkdown.",
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
