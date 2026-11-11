# ToolShell

Description: Server component for the page around a free tool, in order: breadcrumb (Tools › name), `h1` and lead, the tool, "How it works" with the privacy line ("Runs in your browser. Nothing is uploaded."), the HermesMarkdown pitch with the tool's own open button, the FAQ and links to the other tools. Renders the tool's JSON-LD (`toolJsonLd`). Everything but `children` is server-rendered, and the FAQ text matches the FAQPage data.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: `content/tools.ts` (catalog), `tool-json-ld.ts`, `next/link`.

## Quick Usage
```tsx
<ToolShell tool={toolBySlug("tokenizer")} openInWorkspace={<TokenizerOpenButton variant="outlined" />}>
  <TokenizerToolLoader />
</ToolShell>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| tool | `ToolEntry` | | Catalog entry |
| openInWorkspace | `ReactNode` | | Button for the pitch block |
| children | `ReactNode` | | The interactive tool |
