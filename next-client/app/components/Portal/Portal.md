# Portal

Description: Renders children into `document.body` via `createPortal` once the component has mounted on the client.

## Local State & Storage
- State: `mounted` (useState).
- Persistence: None - transient UI state.

## Dependencies
- Core: `react-dom`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import Portal from "@/app/components/Portal";

<Portal><Menu /></Portal>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | Portaled content |
