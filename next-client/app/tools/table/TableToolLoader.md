# TableToolLoader

Description: Loads `TableTool` client-only (`next/dynamic`, `ssr: false`): the grid is a CodeMirror view and the table lives in sessionStorage. `TableSkeleton` ([ToolSkeletons](../components/ToolSkeletons.md)) outlines the tool while it loads so the page doesn't shift, and CodeMirror is fetched only on this route.

## Local State & Storage
- State: none. Persistence: none.

## Quick Usage
```tsx
<TableToolLoader />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
