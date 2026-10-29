# TextLink

Description: The one link primitive: use it for every link instead of a raw `<a>`. Site paths (`/documentation`) render through `next/link`, so they navigate on the client and prefetch. Same-page anchors (`#templates`) and `mailto:` links are plain anchors. Other sites (`https://…`) open in a new tab with `rel="noopener noreferrer"`, unless `target`/`rel` are passed. Every variant has the shared focus ring (as `Button`).

## Local State & Storage
- State: None (stateless).
- Persistence: None.

## Dependencies
- Core: React, `next/link`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TextLink from "@/app/components/TextLink";

<p>See the <TextLink href="#templates">templates</TextLink>.</p>
<TextLink href="https://github.com/marespopa/hermesmarkdown" variant="quiet">Source Code</TextLink>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| href | `string` |  | Site path, `#anchor`, `mailto:` or an external URL |
| children | `ReactNode` |  | Link content |
| variant? | `"inline" \| "quiet" \| "unstyled"` | `"inline"` | `inline`: ink, underlined, for running text (never the accent). `quiet`: inherits the colour, ink on hover. `unstyled`: focus ring only, styled through `className` |
| className? | `string` | `""` | Extra classes |
| target? / rel? |  | new tab + `noopener noreferrer` for external URLs | Override the defaults |
| ref | `Ref<HTMLAnchorElement>` |  | Forwarded to the anchor |
| …rest | anchor attributes |  | Passed through (`aria-current`, `onClick`, …) |
