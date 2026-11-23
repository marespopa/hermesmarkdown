# Alternatives

`/alternatives` and `/alternatives/<slug>`: comparison pages that answer "what is a free alternative to X, and how does HermesMarkdown differ". Server-rendered and static.

| Path | Role |
|---|---|
| `page.tsx` | `/alternatives` hub: a card per entry, BreadcrumbList JSON-LD |
| `[slug]/page.tsx` | One page per entry (`generateStaticParams`, `dynamicParams = false`, `pageMetadata`) |
| `components/AlternativeShell.tsx` | The page: breadcrumb, hero, comparison table, why switch, call to action, FAQ, related links |
| `components/alternative-json-ld.ts` | `alternativeJsonLd`: BreadcrumbList and FAQPage |
| `content/types.ts` | `AlternativeEntry`, `alternativePath` |
| `content/*.ts` | One file per competitor: Typora, Obsidian, Dillinger, StackEdit |
| `content/index.ts` | `ALTERNATIVES`, `alternativeBySlug`: the single source for the pages, sitemap, footer and llms.txt |

Copy rule: claims about another product stay general and checkable (what kind of product it is, where it runs, whether it offers cloud sync); no prices, version numbers or maintenance claims. Claims about HermesMarkdown must match the documentation.
