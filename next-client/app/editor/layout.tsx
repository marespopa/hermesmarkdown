import { Metadata } from "next";
import EditorShell from "./components/EditorShell";
import VaultAccessGate from "./components/VaultAccessGate";

export const metadata: Metadata = {
  title: "Editor — HermesMarkdown",
  description:
    "Edit local Markdown files in your browser with WikiLinks, spreadsheet-style tables, and split panes. No accounts or cloud uploads.",
  alternates: { canonical: "/editor" },
  // The editor is an app shell (client-rendered, no static outgoing links) — keep it out of the index.
  robots: { index: false, follow: true },
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // One shell for every /editor route, so the sidebar stays put between them.
  return (
    <VaultAccessGate>
      <EditorShell>{children}</EditorShell>
    </VaultAccessGate>
  );
}
