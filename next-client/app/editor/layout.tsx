import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor — HermesMarkdown",
  description:
    "Edit local Markdown files in your browser with Smart Workspaces, WikiLinks, and agent-readable context. No accounts or cloud uploads.",
  alternates: { canonical: "/editor" },
  // The editor is an app shell (client-rendered, no static outgoing links) — keep it out of the index.
  robots: { index: false, follow: true },
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
