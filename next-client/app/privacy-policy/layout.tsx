import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — HermesMarkdown",
  description:
    "HermesMarkdown is local-first and collects no personal data. Read our privacy policy.",
  alternates: { canonical: "/privacy-policy" },
  robots: { index: true, follow: false },
  openGraph: {
    title: "Privacy Policy — HermesMarkdown",
    description:
      "HermesMarkdown is local-first and collects no personal data.",
    url: "https://hermesmarkdown.com/privacy-policy",
    siteName: "HermesMarkdown",
    type: "website",
  },
};

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
