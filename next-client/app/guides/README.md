# Guides

`/guides` and `/guides/<slug>`: how-to pages for common ways of using HermesMarkdown, each linking into the documentation articles that go deeper. Server-rendered and static.

| Path | Role |
|---|---|
| `page.tsx` | `/guides` hub: a card per guide, BreadcrumbList JSON-LD |
| `[slug]/page.tsx` | One page per guide (`generateStaticParams`, `dynamicParams = false`, `pageMetadata` with `ogType: "article"`) |
| `components/GuideShell.tsx` | The page: breadcrumb, hero, sections, documentation links, call to action, FAQ, related links |
| `components/guide-json-ld.ts` | `guideJsonLd`: TechArticle, BreadcrumbList and FAQPage |
| `content/types.ts` | `GuideEntry`, `guidePath`, `guideHeadline` |
| `content/*.ts` | One file per guide: Obsidian vault in the browser, offline on a Chromebook, local LLM with Ollama |
| `content/index.ts` | `GUIDES`, `guideBySlug`: the single source for the pages, sitemap, footer and llms.txt |

Every id in a guide's `docs` must be a documentation article (checked in `guides.test.ts`). Claims about HermesMarkdown must match the documentation.
