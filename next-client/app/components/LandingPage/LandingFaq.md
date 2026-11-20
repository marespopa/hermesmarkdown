# LandingFaq

Description: The home page's FAQ. Each question in `LANDING_FAQ` (five at most) is a native `<details>`, folded by default and opened by click or keyboard. A `+` turns into `×` when a question is open. Below the questions are small links to `/markdown-editor`, `/tools` and `/documentation`. The same list feeds the page's FAQPage JSON-LD (`app/page.tsx`).

## Local State & Storage
- State: none (the browser keeps each `<details>` open state). Persistence: none.

## Dependencies
- Core: `TextLink`, `landing-content.ts`, `landing-styles.ts`. Zero-Cloud: no network requests.

## Quick Usage
```tsx
<LandingFaq />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
