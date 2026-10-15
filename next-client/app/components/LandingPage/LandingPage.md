# LandingPage

Description: Home route hero with a "Start Writing" entry point into the editor, plus a "welcome back" toast when a local file is already open. Below the full-screen hero, plain sections give search engines and new visitors the substance: what the editor does (features grid), where notes live per browser, an FAQ, and links to `/markdown-editor`, `/tools` and `/documentation`. The copy lives in `landing-content.ts`; `app/page.tsx` turns `LANDING_FAQ` into the home page's FAQPage JSON-LD, so the visible FAQ and the structured data always match.

## Local State & Storage
- State: `atom_hasOpenFileContent`, `atom_userName`, a name draft (useState), and `atom_resumeRequested`: the welcome-back toast's **Resume** sets it so the editor keeps the restored tabs in front instead of opening the home feed (`useVaultOpenBehavior`); **Start Writing** doesn't.
- Persistence: `atom_userName` → `localStorage["userName"]`.

## Dependencies
- Core: `next/link`, `next/navigation` (prefetches `/editor`), `Button`, `Toast`, `LoadingOverlay`, `landing-content.ts` (feature, platform and FAQ copy).
- Zero-Cloud: No API or telemetry calls. Only Next.js route prefetching, which is same-origin.

## Quick Usage
```tsx
import LandingPage from "@/app/components/LandingPage/LandingPage";

<LandingPage />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
