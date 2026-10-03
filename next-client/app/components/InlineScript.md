# InlineScript

Description: Renders an inline `<script>` that runs once while the browser parses the server-rendered HTML, before the first paint — the root layout uses it for the theme-init script, so dark mode is applied with no flash. On the server it renders `type="text/javascript"`; on the client `type="text/plain"`, because React never runs scripts it renders on the client and warns about executable ones in development ("Encountered a script tag while rendering React component"). `suppressHydrationWarning` accepts the type difference. It must stay a Client Component (`"use client"`): rendered as a Server Component from the root layout, the `typeof window` check only ever runs on the server and the client receives `text/javascript` anyway. Follows the Next.js "Preventing flash before hydration" guide.

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: None.

## Behavior
- Runs only on a full page load (direct visit, refresh), not on client-side navigation — fine for document-level setup like the theme class.
- Data blocks such as `application/ld+json` don't need it: React doesn't warn about non-executable script types.

## Quick Usage
```tsx
import InlineScript from "./components/InlineScript";

<head>
  <InlineScript html={THEME_INIT_SCRIPT} />
</head>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| html | `string` |  | The script source, inserted as-is |
