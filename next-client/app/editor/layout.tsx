import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor — HermesMarkdown",
  description:
    "The HermesMarkdown editor. Local-first, privacy-centric Markdown editing with Smart Workspaces, WikiLinks, and AI-readable frontmatter.",
  alternates: { canonical: "/editor" },
  robots: { index: false, follow: false },
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
