# TopicCards

Description: A grid of rounded cards, one per documentation section, each with an icon, the section name, its one-line `summary` and an article count linking down to the section. Hidden while searching.

## Local State & Storage
- State: None (stateless).
- Persistence: None.

## Dependencies
- Core: `react-icons` (icon per section id, book icon as fallback).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<TopicCards groups={GROUPS} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| groups | `Group[]` |  | Sections to show as cards |
