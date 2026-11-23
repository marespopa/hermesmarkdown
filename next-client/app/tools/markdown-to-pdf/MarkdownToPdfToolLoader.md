# MarkdownToPdfToolLoader

Description: Loads `MarkdownToPdfTool` client-only for `/tools/markdown-to-pdf`: the input lives in sessionStorage and the printout is built in the browser. `PdfSkeleton` ([ToolSkeletons](../components/ToolSkeletons.md)) outlines the tool while it loads.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: `next/dynamic`, `MarkdownToPdfTool`.
- Zero-Cloud: no network or telemetry side effects.

## Quick Usage
```tsx
<MarkdownToPdfToolLoader />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
