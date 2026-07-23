import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Is HermesMarkdown the same as Hermes Agent? — HermesMarkdown",
  description:
    "HermesMarkdown is a local-first Markdown editor that runs in your browser and saves to disk. It is unrelated to Hermes Agent's SOUL.md, memory.md, or plan-mode files. Here's the difference.",
  alternates: { canonical: "/what-is-hermes-md" },
  openGraph: {
    title: "Is HermesMarkdown the same as Hermes Agent?",
    description:
      "HermesMarkdown is a browser-based Markdown editor, not part of the Hermes Agent ecosystem (SOUL.md, memory.md, plan mode). Here's what each actually is.",
    url: "https://hermesmarkdown.com/what-is-hermes-md",
    siteName: "HermesMarkdown",
    type: "article",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Is HermesMarkdown the same as Hermes Agent?",
    description:
      "HermesMarkdown is a browser-based Markdown editor, not part of the Hermes Agent ecosystem. Plain-language explanation.",
    images: ["/assets/og-image.jpg"],
  },
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is HermesMarkdown?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HermesMarkdown is a Markdown editor that runs entirely in your browser and reads/writes files directly to your local disk. There are no accounts, no cloud sync, and no server in between — it's a local-first editor for Markdown folders and vaults.",
      },
    },
    {
      "@type": "Question",
      name: "Is HermesMarkdown related to Hermes Agent?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Hermes Agent (from NousResearch) is a separate AI model/agent project that uses files like SOUL.md, memory.md, and plan-mode markdown to store agent memory and personas. HermesMarkdown is a Markdown text editor and shares no code, files, or format with Hermes Agent — only the word 'Hermes' overlaps.",
      },
    },
    {
      "@type": "Question",
      name: "Does HermesMarkdown use SOUL.md or memory.md?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. SOUL.md and memory.md are Hermes Agent conventions for agent memory and personality storage. HermesMarkdown does not define or require any specific filenames — it edits whatever Markdown files already exist in the folder you open.",
      },
    },
    {
      "@type": "Question",
      name: "Is HermesMarkdown compatible with Obsidian vaults?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "HermesMarkdown can open and edit plain Markdown folders, including ones that happen to be Obsidian vaults, since both just work with .md files on disk. It is not an Obsidian plugin and does not require Obsidian.",
      },
    },
    {
      "@type": "Question",
      name: "What is a hermes.md or .hermes.md file?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "hermes.md and .hermes.md are project-context filenames associated with Hermes Agent and compatible AI coding tools, similar in purpose to AGENTS.md or CLAUDE.md. They are not created or used by HermesMarkdown.",
      },
    },
  ],
};

export default function WhatIsHermesMdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      {children}
    </>
  );
}
