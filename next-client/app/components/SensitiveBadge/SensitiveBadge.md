# SensitiveBadge

Description: A small lock icon that marks a sensitive note in listings: home feed rows, command palette file and task rows, Tasks page rows and the editor veil.

## Local State & Storage
- State: None (presentational).
- Persistence: None.

## Dependencies
- Core: React, `react-icons/hi` (`HiOutlineLockClosed`).
- Zero-Cloud: No network or telemetry side effects.

## Logic
- Renders a 14px lock in `text-fg-faint`, `shrink-0` so it isn't squeezed out of a truncated row.
- Exposed to assistive tech as `role="img"` with `aria-label="Sensitive note"`; the SVG itself is `aria-hidden`.

## Quick Usage
```tsx
import SensitiveBadge from "@/app/components/SensitiveBadge";

{item.isSensitive && <SensitiveBadge />}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className? | `string` | `""` | Extra classes (spacing) |
