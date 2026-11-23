// One how-to guide (/guides/<slug>). Plain text, so the same copy feeds the
// page, its metadata and structured data.

export interface GuideEntry {
  slug: string;
  // <title> and og:title.
  title: string;
  // Meta description, 70–170 characters.
  description: string;
  // One line under the h1.
  lead: string;
  keywords: string[];
  // What the TechArticle's articleSection says.
  section: string;
  // Body sections; each body string is one paragraph.
  sections: { heading: string; body: string[] }[];
  // Documentation article ids the guide links into (/documentation/<id>).
  docs: string[];
  faq: { q: string; a: string }[];
  // Other links shown at the end (tools, alternatives).
  related: { label: string; href: string }[];
}

export const guidePath = (entry: Pick<GuideEntry, "slug">) => `/guides/${entry.slug}`;

// The guide's name without the site suffix: its h1 and breadcrumb.
export const guideHeadline = (entry: Pick<GuideEntry, "title">) => entry.title.replace(/\s*\|\s*HermesMarkdown$/, "");
