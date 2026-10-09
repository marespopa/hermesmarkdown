# ToolCard

Description: One tool on the `/tools` hub: its name and lead, linking to its page.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: `content/tools.ts`, `next/link`.

## Quick Usage
```tsx
<ToolCard tool={tool} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| tool | `ToolEntry` | | Catalog entry |
