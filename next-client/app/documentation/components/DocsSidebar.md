# DocsSidebar

Description: The documentation table of contents: each section's name with its articles listed below, the article in view highlighted (`aria-current="location"`). Rendered as the sticky desktop sidebar and inside the mobile Contents sheet.

## Local State & Storage
- State: None (stateless).
- Persistence: None.

## Dependencies
- Core: None beyond React.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<DocsSidebar groups={visibleGroups} activeId={activeId} onNavigate={closeSheet} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| groups | `Group[]` |  | Sections (already filtered by search) |
| activeId | `string` |  | Article in view |
| onNavigate | `() => void` | — | Called after a link is followed |
