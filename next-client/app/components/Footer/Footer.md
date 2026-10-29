# Footer

Description: Site footer for marketing pages (hidden on `/editor`) with links, app version, and the `ProductHuntBadge`/`ToolsCafeBadge` sub-components.

## Local State & Storage
- State: None.
- Persistence: None - transient UI state.

## Dependencies
- Core: `next/link`, `next/image`, `ClientOnly`, `package.json` version.
- Network: The badges load third-party images (`api.producthunt.com`, `tools.cafe`) when rendered. Outbound links go to GitHub and the author site. No telemetry.

## Quick Usage
```tsx
import Footer from "./Footer/Footer.component";

<Footer />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
