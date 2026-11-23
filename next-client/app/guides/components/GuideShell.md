# GuideShell

Description: The page for one `/guides/<slug>` entry (server component). In order: breadcrumb (Guides › section), `PageHero` with the guide's headline and lead, the guide's sections (a heading and paragraphs each), "Go deeper in the documentation" (a link and the lead of each article in `entry.docs`, looked up with `findArticle`; an unknown id is skipped), a "Try it now" link to `/editor`, the FAQ, and related links. Outputs TechArticle, BreadcrumbList and FAQPage JSON-LD through `serializeJsonLd`.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: `GuideEntry`, `guideJsonLd`, `findArticle` (`app/documentation/content/lookup.ts`), `PageHero`, `TextLink`, `serializeJsonLd`.
- Zero-Cloud: static page; no network or telemetry side effects.

## Quick Usage
```tsx
<GuideShell entry={guideBySlug("offline-markdown-editor-chromebook")!} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| `entry` | `GuideEntry` | | The guide's copy |
