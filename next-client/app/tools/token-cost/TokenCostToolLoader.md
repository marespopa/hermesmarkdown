# TokenCostToolLoader

Description: Loads `TokenCostTool` client-only (`next/dynamic`, `ssr: false`), since its text lives in sessionStorage, with a fixed-height skeleton so the page doesn't shift when it mounts. Server components can't use `ssr: false`, so the page renders this client wrapper.

## Local State & Storage
- State: none. Persistence: none.

## Quick Usage
```tsx
<TokenCostToolLoader />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
