import { Metadata } from "next";

export const metadata: Metadata = {
  title: "What Is a Markdown Editor? Popular Tools & Key Features — HermesMarkdown",
  description:
    "A Markdown editor lets you write plain text with lightweight formatting symbols while showing a live preview. Compare popular Markdown editors, key features to look for, and where HermesMarkdown fits in.",
  alternates: { canonical: "/markdown-editor" },
  openGraph: {
    title: "What Is a Markdown Editor? Popular Tools & Key Features",
    description:
      "A plain-language guide to Markdown editors: what they are, the features that matter, and a comparison of popular tools including HermesMarkdown.",
    url: "https://hermesmarkdown.com/markdown-editor",
    siteName: "HermesMarkdown",
    type: "article",
    images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "What Is a Markdown Editor? Popular Tools & Key Features",
    description:
      "What Markdown editors are, the features that matter, and how popular tools compare — including HermesMarkdown.",
    images: ["/assets/og-image.jpg"],
  },
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a Markdown editor?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A Markdown editor is a tool that lets you write and format plain text using lightweight markup symbols (like # for headings or ** for bold) while showing a live or rendered preview of the formatted result.",
      },
    },
    {
      "@type": "Question",
      name: "What are the most popular Markdown editors?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Popular Markdown editors include HermesMarkdown (a local-first, browser-based editor with no accounts or cloud uploads), Obsidian, Typora, iA Writer, Zettlr, Mark Text, and Dillinger.",
      },
    },
    {
      "@type": "Question",
      name: "What features should a Markdown editor have?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Key features to look for are a live or side-by-side preview, syntax highlighting, WikiLinks or backlinking between notes, keyboard shortcuts, offline/local file support, and export to formats like HTML or PDF.",
      },
    },
    {
      "@type": "Question",
      name: "Do Markdown editors require an account or cloud storage?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not always. Local-first Markdown editors, such as HermesMarkdown, read and write files directly to your device's disk through the browser's File System Access API, so no account or cloud upload is required.",
      },
    },
  ],
};

export default function MarkdownEditorLayout({
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
