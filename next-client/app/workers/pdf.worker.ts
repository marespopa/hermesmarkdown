// PDF.js's parser, run off the main thread and bundled like the app's other
// workers (same origin, so the CSP's worker-src 'self' admits it). Loaded by
// app/editor/utils/pdfjs.ts only once a PDF is opened.
import "pdfjs-dist/build/pdf.worker.mjs";
