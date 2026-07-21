import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor — HermesMarkdown",
  description:
    "The HermesMarkdown editor. Local-first Markdown editing with Smart Workspaces, WikiLinks, live-formula tables, and a .hermes/ frontmatter schema agents can index without opening every file.",
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
