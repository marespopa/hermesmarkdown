# PdfViewerLoader

Description: What [PaneLeaf](PaneLeaf.md) renders when the open file is a PDF (`isPdfPath`). It loads [PdfViewer](PdfViewer.md) with `next/dynamic` (`ssr: false`), so the viewer, its text-layer CSS and PDF.js arrive in their own chunks on the first PDF. The editor route's first load doesn't change. PaneLeaf keys it by path, so each PDF opens at the top, fitted.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: `next/dynamic`, [PdfViewer](PdfViewer.md). Zero-Cloud: no network requests beyond the app's own chunks.

## Quick Usage
```tsx
<PdfViewerLoader key={path} path={path} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| path | `string` |  | Vault path of the PDF |
