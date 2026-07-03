import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — HermesMarkdown",
  description:
    "Full reference for how HermesMarkdown puts context engineering — write, select, compress, isolate — into practice: vaults, the .hermes/ agent context protocol (AGENTS.md, schema.yaml, index.yaml), WikiLinks, Smart Workspaces, Slash Commands, the Table Editor, and more.",
  alternates: { canonical: "/documentation" },
  openGraph: {
    title: "Documentation — HermesMarkdown",
    description:
      "How HermesMarkdown implements context engineering file by file — writing, navigating, and setting up agent context.",
    url: "https://hermesmarkdown.com/documentation",
    siteName: "HermesMarkdown",
    type: "website",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HermesMarkdown Documentation",
    description:
      "How HermesMarkdown implements context engineering — write, select, compress, isolate — file by file.",
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
