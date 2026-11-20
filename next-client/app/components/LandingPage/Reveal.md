# Reveal

Description: A home page section's entrance. When the section first scrolls into view (an IntersectionObserver, 10% in from the bottom), it fades in and rises 12px, once. Content is visible until the page hydrates, so server HTML, crawlers and no-JS readers see everything. A section already on screen at load never hides. Under reduced motion, or without IntersectionObserver, nothing moves.

## Local State & Storage
- State: `hidden` (useState). Persistence: none.

## Dependencies
- Core: none. Zero-Cloud: no network requests.

## Quick Usage
```tsx
<Reveal className="grid gap-10"><h2>…</h2></Reveal>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | The content that enters |
| className | `string` | `""` | Classes for the wrapper |
