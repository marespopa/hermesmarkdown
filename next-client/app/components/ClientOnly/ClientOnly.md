# ClientOnly

Description: Renders children only after mount, avoiding SSR hydration mismatches for browser-only UI.

## Local State & Storage
- State: `hasMounted` (useState).
- Persistence: None - transient UI state.

## Dependencies
- Core: React only.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import ClientOnly from "@/app/components/ClientOnly";

<ClientOnly className="flex"><VersionBadge /></ClientOnly>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | Client-only content |
| ...delegated | `div` attributes |  | Forwarded to the wrapper `<div>` |
