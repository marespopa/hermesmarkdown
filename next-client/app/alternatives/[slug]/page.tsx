import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/app/utils/page-metadata";
import AlternativeShell from "../components/AlternativeShell";
import { ALTERNATIVES, alternativeBySlug, alternativePath } from "../content";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return ALTERNATIVES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = alternativeBySlug(slug);
  if (!entry) return {};
  return pageMetadata({
    path: alternativePath(entry),
    title: entry.title,
    description: entry.description,
    keywords: entry.keywords,
  });
}

export default async function AlternativePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const entry = alternativeBySlug(slug);
  if (!entry) notFound();
  return <AlternativeShell entry={entry} />;
}
