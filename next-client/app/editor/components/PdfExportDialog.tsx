"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import type { PdfJob } from "../hooks/use-export-pdf";
import { PREVIEW_FRAME_WIDTH, previewDocument } from "../utils/print-preview";

interface PdfExportDialogProps {
  job: PdfJob | null;
  onClose: () => void;
  onPrint: () => void;
}

// The export dialog: the note's page setup (from its `pdf_*` frontmatter)
// beside a preview of the pages. Save as PDF… opens the browser's print
// dialog.
export default function PdfExportDialog({ job, onClose, onPrint }: PdfExportDialogProps) {
  const html = useMemo(() => (job ? previewDocument(job.title, job.body, job.settings, job.date) : ""), [job]);
  const settings = job?.settings;
  const rows = settings
    ? [
        { label: "Page", value: settings.pageSize },
        { label: "Margins", value: settings.margins },
        { label: "Header", value: settings.header ?? "None" },
        { label: "Footer", value: settings.footer ?? "None" },
        { label: "Page break", value: settings.pageBreak },
      ]
    : [];

  return (
    <DialogModal isOpened={job !== null} onClose={onClose} onConfirm={onPrint} styles="!max-w-[1100px]" ariaLabelledBy="pdf-export-title">
      <div className="flex w-full min-w-0 flex-col gap-4">
        <h3 id="pdf-export-title" className="text-lg font-semibold">Export as PDF</h3>
        <div className="grid min-h-0 gap-4 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-ui-footnote">
              {rows.map((row) => (
                <React.Fragment key={row.label}>
                  <dt className="text-ink-muted dark:text-stone">{row.label}</dt>
                  <dd className="break-words font-mono">{row.value}</dd>
                </React.Fragment>
              ))}
            </dl>
            <p className="text-ui-footnote text-fg-faint">
              Set these in the note&apos;s frontmatter: <code>pdf_page_size</code>, <code>pdf_margins</code>,{" "}
              <code>pdf_header</code>, <code>pdf_footer</code> and <code>pdf_page_break</code>. Headers and
              footers can use {"{title}"}, {"{date}"}, {"{page}"} and {"{pages}"}.
            </p>
          </div>
          <div className="flex min-h-[320px] flex-col gap-1.5">
            <span className="px-0.5 text-ui-footnote font-medium text-ink-muted dark:text-stone">Preview</span>
            {job && <PagePreview html={html} title={job.title} />}
            <span className="px-0.5 text-ui-footnote text-fg-faint">
              Long sections run onto more pages when printed; faint lines show roughly where.
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="secondary" className="h-11 px-6 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="h-11 px-6 rounded-xl" onClick={onPrint}>Save as PDF…</Button>
        </div>
      </div>
    </DialogModal>
  );
}

// The preview document laid out at a fixed width and scaled to the pane, so
// the pages keep their proportions however wide the dialog is. Scripts stay
// off; same-origin lets it show the note's images (object URLs).
function PagePreview({ html, title }: { html: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: PREVIEW_FRAME_WIDTH / 2, height: 480 });

  useEffect(() => {
    const element = box.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(1, size.width / PREVIEW_FRAME_WIDTH);
  return (
    <div ref={box} className="relative h-[60vh] min-h-[300px] overflow-hidden rounded-xl border border-edge">
      <iframe
        title={`Preview of ${title}`}
        srcDoc={html}
        sandbox="allow-same-origin"
        className="absolute left-0 top-0 origin-top-left border-0"
        style={{ width: PREVIEW_FRAME_WIDTH, height: size.height / scale, transform: `scale(${scale})` }}
      />
    </div>
  );
}
