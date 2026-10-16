"use client";

import { useExportPdf } from "../hooks/use-export-pdf";
import { useDownloadCompiled } from "../hooks/use-download-compiled";
import { useExportHtml } from "../hooks/use-export-html";
import PdfExportDialog from "./PdfExportDialog";

// Mounts Export as PDF (palette command and the toolbar's More menu event)
// once per editor page, and the export dialog it opens; also Download
// Compiled Markdown and Export as HTML, which share its embed compiling
// (and, for HTML, its rendering).
export default function PdfExport() {
  const { job, close, print } = useExportPdf();
  useDownloadCompiled();
  useExportHtml();
  return <PdfExportDialog job={job} onClose={close} onPrint={() => void print()} />;
}
