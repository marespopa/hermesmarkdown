import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — HermesMarkdown",
  description:
    "Full reference for HermesMarkdown: vaults, WikiLinks, Smart Workspaces, Slash Commands, shortcodes, the Table Editor, Zen Mode, and more.",
  alternates: { canonical: "/documentation" },
  openGraph: {
    title: "Documentation — HermesMarkdown",
    description:
      "Everything you need to know about writing and navigating in HermesMarkdown.",
    url: "https://hermesmarkdown.com/documentation",
    siteName: "HermesMarkdown",
    type: "website",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HermesMarkdown Documentation",
    description:
      "Everything you need to know about writing and navigating in HermesMarkdown.",
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
