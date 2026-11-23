import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/app/utils/page-metadata";
import GuideShell from "../components/GuideShell";
import { GUIDES, guideBySlug, guidePath } from "../content";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = guideBySlug(slug);
  if (!entry) return {};
  return pageMetadata({
    path: guidePath(entry),
    title: entry.title,
    description: entry.description,
    keywords: entry.keywords,
    ogType: "article",
  });
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const entry = guideBySlug(slug);
  if (!entry) notFound();
  return <GuideShell entry={entry} />;
}
