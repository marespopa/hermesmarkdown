"use client";

import dynamic from "next/dynamic";

// The only thing PaneLeaf imports: the viewer (and PDF.js behind it) loads in
// its own chunk on the first PDF, so the editor route's first load stays unchanged.
const PdfViewer = dynamic(() => import("./PdfViewer"), {
  ssr: false,
  loading: () => <div className="h-full" aria-hidden="true" />,
});

export default function PdfViewerLoader({ path }: { path: string }) {
  return <PdfViewer path={path} />;
}
