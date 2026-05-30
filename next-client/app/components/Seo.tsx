"use client";

import Head from "next/head";

export const defaultMeta = {
  title: "HermesMarkdown — Pure, Private Markdown Editor",
  siteName: "HermesMarkdown",
  description: `A minimalist, local-first Markdown editor designed for deep work. 100% private. No cloud, no tracking, just the interface between your mind and the page.`,
  url: "https://hermesmarkdown.com",
  type: "website",
  robots: "follow, index",
};

type SeoProps = {
  date?: string;
  templateTitle?: string;
} & Partial<typeof defaultMeta>;

export default function Seo(props: SeoProps) {
  const meta = {
    ...defaultMeta,
    ...props,
  };

  meta["title"] = props.templateTitle
    ? `${props.templateTitle} — ${meta.siteName}`
    : meta.title;

  return (
    <Head>
      <title>{meta.title}</title>

      {/* Search Engine Optimization */}
      <meta
        name="google-site-verification"
        content="EE5yya1yV2WhmcOZGqZzSRz_bbpqRfai3xXvB4Sb--A"
      />
      <meta name="robots" content={meta.robots} />
      <meta content={meta.description} name="description" />
      <meta
        name="keywords"
        content="markdown editor, private markdown, local-first, minimalist editor, iA Writer alternative, secure writing, no cloud editor"
      />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={meta.type} />
      <meta property="og:site_name" content={meta.siteName} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:url" content={meta.url} />
      <meta
        property="og:image"
        content="https://hermesmarkdown.com/og-image.png"
      />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@smoothwizz" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta
        name="twitter:image"
        content="https://hermesmarkdown.com/og-image.png"
      />

      {meta.date && (
        <>
          <meta property="article:published_time" content={meta.date} />
          <meta
            name="publish_date"
            property="og:publish_date"
            content={meta.date}
          />
          <meta name="author" property="article:author" content="Mares Popa" />
        </>
      )}

      {/* Branding & Icons */}
      <link rel="canonical" href={meta.url} />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
      <meta name="theme-color" content="#ffffff" />
    </Head>
  );
}
