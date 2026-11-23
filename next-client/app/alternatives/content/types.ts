// One "alternative to X" landing page (/alternatives/<slug>). Copy is plain
// text, so it can go into metadata, the page and the structured data as it is.

export interface AlternativeEntry {
  slug: string;
  // The other product's name, for the table header and the breadcrumb.
  competitor: string;
  // <title> and og:title.
  title: string;
  // Meta description, 70–170 characters.
  description: string;
  // One line under the h1.
  lead: string;
  keywords: string[];
  whySwitch: { title: string; body: string }[];
  comparison: { feature: string; hermes: string; them: string }[];
  faq: { q: string; a: string }[];
  // Links shown at the end: tools, guides, documentation articles.
  related: { label: string; href: string }[];
}

export const alternativePath = (entry: Pick<AlternativeEntry, "slug">) => `/alternatives/${entry.slug}`;
