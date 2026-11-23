import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TextLink from "@/app/components/TextLink";
import { breadcrumbJsonLd } from "@/app/tools/components/tool-json-ld";
import { techArticleJsonLd } from "@/app/utils/article-json-ld";
import { serializeJsonLd } from "@/app/utils/json-ld";
import { pageMetadata } from "@/app/utils/page-metadata";
import { ARTICLE_BODY } from "../doc-primitives";
import { allArticles, articlePath, findArticle } from "../content/lookup";

// One documentation article on its own URL. A server component: the bodies
// are plain JSX, and the links in them are client leaves.

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return allArticles().map(({ item }) => ({ slug: item.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) return {};
  const { item } = article;
  return pageMetadata({
    path: articlePath(item.id),
    title: `${item.seoTitle ?? item.title} — HermesMarkdown Docs`,
    description: item.lead,
    keywords: item.keywords?.split(/\s+/).filter(Boolean),
    ogType: "article",
  });
}

export default async function DocumentationArticle({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();
  const { item, group, prev, next } = article;
  const path = articlePath(item.id);

  const jsonLd = [
    techArticleJsonLd({ path, title: item.seoTitle ?? item.title, description: item.lead, section: group.label }),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Docs", path: "/documentation" },
      { name: group.label, path: `/documentation#${group.id}` },
      { name: item.title, path },
    ]),
  ];

  return (
    <div className="container max-w-screen-xl pb-24 lg:pb-32">
      {jsonLd.map((entry, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(entry) }} />
      ))}
      <div className="mx-auto max-w-[720px] pt-10">
        <nav aria-label="Breadcrumb" className="text-[14px] text-fg-muted">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <TextLink href="/documentation" variant="quiet">Docs</TextLink>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <TextLink href={`/documentation#${group.id}`} variant="quiet">{group.label}</TextLink>
            </li>
            <li aria-hidden="true">›</li>
            <li aria-current="page">{item.title}</li>
          </ol>
        </nav>

        <article className="py-10">
          <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.025em] leading-tight text-fg">{item.title}</h1>
          <p className="mt-3 text-[19px] leading-[1.45] text-fg-muted">{item.lead}</p>
          <div className={`mt-6 ${ARTICLE_BODY}`}>{item.body}</div>
        </article>

        <nav aria-label="More in this section" className="flex flex-wrap justify-between gap-4 border-t border-edge-subtle pt-6 text-[15px]">
          {prev ? (
            <TextLink href={articlePath(prev.id)} variant="quiet">‹ {prev.title}</TextLink>
          ) : (
            <span />
          )}
          {next && <TextLink href={articlePath(next.id)} variant="quiet">{next.title} ›</TextLink>}
        </nav>
      </div>
    </div>
  );
}
