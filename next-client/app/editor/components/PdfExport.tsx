"use client";

import { useExportPdf } from "../hooks/use-export-pdf";

// Mounts Export as PDF (palette command and the toolbar's More menu event)
// once per editor page. Renders nothing; the print dialog is the UI.
export default function PdfExport() {
  useExportPdf();
  return null;
}
