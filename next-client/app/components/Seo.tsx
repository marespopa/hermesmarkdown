"use-client";

import Head from "next/head";

export const defaultMeta = {
  title: "Hermes Markdown - Free Online Markdown Editor",
  siteName: "Hermes Markdown",
  description: `Hermes Markdown is a free, privacy-focused online markdown editor that works entirely offline. Create beautiful documents with real-time preview, professional templates, and export to PDF or HTML. Perfect for writers, developers, students, and professionals who need a reliable, secure tool for creating well-formatted content.`,
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
    ? `${props.templateTitle} | ${meta.siteName}`
    : meta.title;

  return (
    <Head>
      <title>{meta.title}</title>
      {/* Google Search Console */}
      <meta
        name="google-site-verification"
        content="EE5yya1yV2WhmcOZGqZzSRz_bbpqRfai3xXvB4Sb--A"
      />
      <meta name="robots" content={meta.robots} />
      <meta content={meta.description} name="description" />
      {/* Open Graph */}
      <meta property="og:type" content={meta.type} />
      <meta property="og:site_name" content={meta.siteName} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:title" content={meta.title} />
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@smoothwizz" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
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
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
      <meta name="theme-color" content="#ffffff" />
    </Head>
  );
}
