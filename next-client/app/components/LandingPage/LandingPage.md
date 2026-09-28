# LandingPage

Description: Home route hero with a "Start Writing" entry point into the editor and a note on where vaults can live (disk folders on Chromium, browser vaults elsewhere, offline everywhere), plus a "welcome back" toast when a local file is already open.

## Local State & Storage
- State: `atom_hasOpenFileContent`, `atom_userName`, and a name draft (useState).
- Persistence: `atom_userName` → `localStorage["userName"]`.

## Dependencies
- Core: `next/link`, `next/navigation` (prefetches `/editor`), `Button`, `Toast`, `LoadingOverlay`.
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
