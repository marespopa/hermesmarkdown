"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAtom } from "jotai";
import { atom_pdfSettings } from "@/app/atoms/print-atoms";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Input from "@/app/components/Input";
import Toggle from "@/app/components/Toggle";
import { DEFAULT_PAGE_BREAK, type MarginSize, type PageSize, type PrintSettings } from "@/app/utils/print/print-settings";
import { SegmentedControl } from "../settings/components/SettingControls";
import type { PdfJob } from "../hooks/use-export-pdf";
import { PREVIEW_FRAME_WIDTH, previewDocument } from "../utils/print-preview";

interface PdfExportDialogProps {
  job: PdfJob | null;
  onClose: () => void;
  onPrint: () => void;
}

const PAPER_OPTIONS: { label: string; value: PageSize }[] = [
  { label: "A4", value: "A4" },
  { label: "Letter", value: "Letter" },
];
const MARGIN_OPTIONS: { label: string; value: MarginSize }[] = [
  { label: "Narrow", value: "narrow" },
  { label: "Normal", value: "normal" },
  { label: "Wide", value: "wide" },
];
const PREVIEW_DELAY_MS = 250;

// The export dialog: page setup controls (paper, margins, header, footer,
// rules as page breaks; remembered for the next export) beside a preview of
// the pages. Save as PDF… opens the browser's print dialog.
export default function PdfExportDialog({ job, onClose, onPrint }: PdfExportDialogProps) {
  const [settings, setSettings] = useAtom(atom_pdfSettings);
  const update = (patch: Partial<PrintSettings>) => setSettings({ ...settings, ...patch });
  // The preview follows typing a moment later, so the frame isn't rebuilt per key.
  const [previewSettings, setPreviewSettings] = useState(settings);
  useEffect(() => {
    const timer = setTimeout(() => setPreviewSettings(settings), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [settings]);
  const html = useMemo(() => (job ? previewDocument(job.title, job.body, previewSettings, job.date) : ""), [job, previewSettings]);

  return (
    <DialogModal isOpened={job !== null} onClose={onClose} onConfirm={onPrint} styles="!max-w-[1100px]" ariaLabelledBy="pdf-export-title">
      <div className="flex w-full min-w-0 flex-col gap-4">
        <h3 id="pdf-export-title" className="text-lg font-semibold">Export as PDF</h3>
        <div className="grid min-h-0 gap-4 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <Field label="Paper">
              <SegmentedControl options={PAPER_OPTIONS} value={settings.pageSize} onChange={(pageSize) => update({ pageSize })} />
            </Field>
            <Field label="Margins">
              <SegmentedControl options={MARGIN_OPTIONS} value={settings.margins} onChange={(margins) => update({ margins })} />
            </Field>
            <div className="flex flex-col">
              <Input
                name="pdf-header"
                label="Header"
                value={settings.header ?? ""}
                placeholder="e.g. {title} | {date}"
                handleChange={(e) => update({ header: e.target.value || null })}
                className="!my-0"
              />
              <Input
                name="pdf-footer"
                label="Footer"
                value={settings.footer ?? ""}
                placeholder="e.g. {page} / {pages}"
                handleChange={(e) => update({ footer: e.target.value || null })}
              />
              <p className="px-0.5 text-ui-footnote text-fg-faint">
                Use {"{title}"}, {"{date}"}, {"{page}"} and {"{pages}"}. A <code>|</code> splits it into left | right,
                or left | centre | right.
              </p>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-ui-footnote font-medium text-ink-light dark:text-ink-dark">New page at each rule</span>
                <span className="text-ui-footnote text-fg-faint">
                  Every <code>---</code> starts a page. <code>{DEFAULT_PAGE_BREAK}</code> always does.
                </span>
              </div>
              <Toggle variant="soft" active={settings.breakAtRules} onChange={(breakAtRules) => update({ breakAtRules })} label="New page at each rule" />
            </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-0.5 text-ui-footnote font-medium text-ink-muted dark:text-stone">{label}</span>
      {children}
    </div>
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
