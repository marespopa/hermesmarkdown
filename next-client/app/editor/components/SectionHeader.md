# SectionHeader

Description: Collapsible section header with a title, a chevron toggle, and an optional trailing action.

## Local State & Storage
- State: None (controlled).
- Persistence: None - transient UI state.

## Dependencies
- Core: `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import SectionHeader from "./SectionHeader";

<SectionHeader title="Files" isExpanded={open} onToggle={() => setOpen(!open)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| title | `string` |  | Heading |
| isExpanded | `boolean` |  | Chevron state |
| onToggle | `() => void` |  | Toggle handler |
| action? | `ReactNode` |  | Trailing control |
