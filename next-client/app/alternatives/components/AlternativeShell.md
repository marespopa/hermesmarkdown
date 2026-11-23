# AlternativeShell

Description: The page for one `/alternatives/<slug>` entry (server component). In order: breadcrumb (Alternatives › competitor), `PageHero` ("HermesMarkdown vs X" and the lead), the comparison table (a row per feature, with row and column headers; scrolls sideways on narrow screens) and a note that the other product is separate and unaffiliated, "Why switch" reasons, a "Try it now" link to `/editor`, the FAQ, and related tools, guides and documentation links. Outputs BreadcrumbList and FAQPage JSON-LD through `serializeJsonLd`.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: `AlternativeEntry`, `alternativeJsonLd`, `PageHero`, `TextLink`, `serializeJsonLd`.
- Zero-Cloud: static page; no network or telemetry side effects.

## Quick Usage
```tsx
<AlternativeShell entry={alternativeBySlug("obsidian-web-editor")!} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| `entry` | `AlternativeEntry` | | The page's copy |
