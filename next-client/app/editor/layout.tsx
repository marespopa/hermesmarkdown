import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor — HermesMarkdown",
  description:
    "Edit local Markdown files in your browser with Smart Workspaces, WikiLinks, and agent-readable context. No accounts or cloud uploads.",
  alternates: { canonical: "/editor" },
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
