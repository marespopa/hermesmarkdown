# MarkdownCleanerToolLoader

Description: Loads `MarkdownCleanerTool` client-only (`next/dynamic`, `ssr: false`): its input lives in sessionStorage and HTML conversion needs the DOM. `CleanerSkeleton` ([ToolSkeletons](../components/ToolSkeletons.md)) outlines the tool while it loads.

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `next/dynamic`, `MarkdownCleanerTool`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<ToolShell tool={tool} openInWorkspace={<CleanerOpenButton variant="outlined" />}>
  <MarkdownCleanerToolLoader />
</ToolShell>
```

## Props Overview
None.
