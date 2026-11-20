# LandingSpecs

Description: The home page's specs (`#specs`): a quiet two-column `<dl>` with hairline rows, in the style of a tech-specs table. Each fact and trade-off is said once: files (Markdown notes, code with syntax highlighting, plain text, images, PDFs), storage (a folder on disk in Chrome and Edge on a computer; browser storage elsewhere), account, offline, AI, export, themes, keyboard. Rows come from `LANDING_SPECS`. The statement's "See the specs" link points here.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: `landing-content.ts`, `landing-styles.ts`. Zero-Cloud: no network requests.

## Quick Usage
```tsx
<LandingSpecs />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
