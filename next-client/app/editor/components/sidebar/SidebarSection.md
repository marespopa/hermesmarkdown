# SidebarSection

Description: A titled, collapsible sidebar group, easy to tell from its neighbours: a hairline above it, then a header caption (`text-ui-caption`, semibold, muted) led by a disclosure chevron that is always shown (right when folded, down when open). The whole header folds or unfolds it; the optional ⋯ menu (`menu`, in `TabContextMenu`) shows on hover or focus, and while open. Folding is remembered by title (`atom_sidebarCollapsed`); `defaultCollapsed` starts it folded until it is opened once.

## Local State & Storage
- State: `atom_sidebarCollapsed`; the open menu (local).
- Persistence: None.

## Dependencies
- Core: `TabContextMenu`, `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SidebarSection title="Tags" defaultCollapsed>…</SidebarSection>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| title | `string` | | Header and memory key |
| menu? | `SectionMenuItem[]` | | ⋯ menu items |
| defaultCollapsed? | `boolean` | | Folded until opened |
| children | `ReactNode` | | Rows |
