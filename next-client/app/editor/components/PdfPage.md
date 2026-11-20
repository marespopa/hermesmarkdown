# PdfPage

Description: One page of a [PdfViewer](PdfViewer.md): a white sheet with a soft shadow (`role="group"`, "Page n"), sized from the page's dimensions times the scale before it draws, so scrolling never jumps. Once the sheet comes within a screen of the view (an IntersectionObserver on the viewer's scroller), PDF.js draws it to a canvas at the screen's pixel density. A PDF.js `TextLayer` then lays the page's text over it, invisible but selectable and copyable, aligned by PDF.js's own `pdf_viewer.css` and the sheet's `--scale-factor` / `--total-scale-factor`. A new zoom redraws the page, cancelling any draw still running. A page scrolled away keeps its last picture. A page that fails to draw stays blank without affecting the others.

## Local State & Storage
- State: whether the sheet is near the view; the scale last drawn (a ref). Persistence: none.

## Dependencies
- Core: `pdfjs-dist` (types and `pdf_viewer.css`), `utils/pdfjs.ts`. Zero-Cloud: no network requests.

## Quick Usage
```tsx
<PdfPage pdf={pdf} number={1} width={612} height={792} scale={1.2} root={scroller} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| pdf | `PDFDocumentProxy` |  | The open document |
| number | `number` |  | 1-based page number |
| width / height | `number` |  | The page's size at scale 1 |
| scale | `number` |  | Fit times zoom |
| root | `HTMLElement \| null` |  | The viewer's scroller, for the near-view check |
