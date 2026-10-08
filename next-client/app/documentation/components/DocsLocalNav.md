# DocsLocalNav

Description: The documentation page's own bar, sticking directly under the site header. It shows the page title (back to the top), one link per section on wide screens with the section in view marked, a Contents button naming the current section on narrow screens, and an **Open Editor** pill.

## Local State & Storage
- State: None (stateless).
- Persistence: None.

## Dependencies
- Core: `Button`, `next/link`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<DocsLocalNav groups={GROUPS} activeGroupId="editor" top={headerHeight} onOpenContents={openSheet} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| groups | `Group[]` |  | Documentation sections |
| activeGroupId | `string` |  | Section in view |
| top | `number` |  | Sticky offset: the site header's height |
| onOpenContents | `() => void` |  | Opens the mobile Contents sheet |
