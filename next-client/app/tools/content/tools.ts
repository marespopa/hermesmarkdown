import type { Metadata } from "next";
import { MARKDOWN_TABLE_GENERATOR } from "./markdown-table-generator";
import { TOKENIZER } from "./tokenizer";

// The free tools (/tools/*): one entry per page. The single source for the
// hub, each page's copy and metadata, the sitemap and the footer. A tool is
// listed here only once its page exists.

export const SITE_URL = "https://hermesmarkdown.com";

export interface ToolEntry {
  slug: "markdown-table-generator" | "tokenizer";
  // Short name for cards, links and the breadcrumb.
  name: string;
  // <title> and og:title.
  title: string;
  // Meta description, 70–170 characters.
  description: string;
  // One line under the h1.
  lead: string;
  keywords: string[];
  steps: [string, string, string];
  faq: { q: string; a: string }[];
  // Feature list for the WebApplication structured data.
  features: string[];
}

export const TOOLS: ToolEntry[] = [MARKDOWN_TABLE_GENERATOR, TOKENIZER];

export function toolBySlug(slug: ToolEntry["slug"]): ToolEntry {
  const tool = TOOLS.find((entry) => entry.slug === slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}

export const toolPath = (tool: ToolEntry) => `/tools/${tool.slug}`;

export function toolMetadata(tool: ToolEntry): Metadata {
  const url = `${SITE_URL}${toolPath(tool)}`;
  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: toolPath(tool) },
    openGraph: {
      title: tool.title,
      description: tool.description,
      url,
      siteName: "HermesMarkdown",
      type: "website",
      images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: tool.title,
      description: tool.description,
      images: ["/assets/og-image.jpg"],
    },
  };
}
