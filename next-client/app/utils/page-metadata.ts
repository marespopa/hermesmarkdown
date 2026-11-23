import type { Metadata } from "next";
import { SITE_URL } from "@/app/tools/content/tools";

// Title and description of the home page; the root layout uses them as the
// site-wide defaults.
export const HOME_TITLE = "HermesMarkdown — A Markdown Editor in Your Browser, Offline and Private";
export const SITE_DESCRIPTION =
  "A minimal Markdown editor that runs in your browser. Edit notes in local folders, saved to disk or to a browser vault on Safari, Firefox and mobile. Works offline. No accounts, no cloud.";

interface PageMetadataInput {
  // Site path with a leading slash and no trailing one: "/" or "/tools".
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  ogType?: "website" | "article";
}

// Metadata for a marketing page: its own canonical (so no page inherits the
// home page's), Open Graph and Twitter cards. The same shape as toolMetadata().
export function pageMetadata({ path, title, description, keywords, ogType = "website" }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
      siteName: "HermesMarkdown",
      type: ogType,
      images: [{ url: "/assets/og-image.jpg", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/assets/og-image.jpg"],
    },
  };
}
