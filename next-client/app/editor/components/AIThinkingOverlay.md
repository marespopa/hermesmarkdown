# AIThinkingOverlay

Description: Portaled busy indicator with rotating status messages, shown while an AI request is in flight.

## Local State & Storage
- State: Current message and fade visibility (useState/useRef).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Portal`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { AIThinkingOverlay } from "./AIThinkingOverlay";

{isAiLoading && <AIThinkingOverlay />}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
