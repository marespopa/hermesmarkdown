"use client";

import { useExportPdf } from "../hooks/use-export-pdf";
import PdfExportDialog from "./PdfExportDialog";

// Mounts Export as PDF (palette command and the toolbar's More menu event)
// once per editor page, and the export dialog it opens.
export default function PdfExport() {
  const { job, close, print } = useExportPdf();
  return <PdfExportDialog job={job} onClose={close} onPrint={() => void print()} />;
}
