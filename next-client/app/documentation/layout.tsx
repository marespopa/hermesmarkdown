import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — HermesMarkdown",
  description:
    "Learn HermesMarkdown's local-first workflow with guides to vaults (on disk, in the browser, or on GitHub), offline use, WikiLinks, tables and formulas, tasks, and AI features.",
  alternates: { canonical: "/documentation" },
  openGraph: {
    title: "Documentation — HermesMarkdown",
    description:
      "How HermesMarkdown works, feature by feature — writing, tables, navigating, vaults, and AI.",
    url: "https://hermesmarkdown.com/documentation",
    siteName: "HermesMarkdown",
    type: "website",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HermesMarkdown Documentation",
    description:
      "How HermesMarkdown works, feature by feature — writing, tables, navigating, vaults, and AI.",
    images: ["/assets/og-image.jpg"],
  },
};

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
