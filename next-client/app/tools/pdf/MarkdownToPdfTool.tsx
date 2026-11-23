"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useAtom } from "jotai";
import { atom_pdfToolMarkdown } from "@/app/atoms/tool-atoms";
import Button from "@/app/components/Button";
import { Textarea } from "@/app/components/Input";
import { showErrorToast } from "@/app/components/Toastr";
import { printDate, DEFAULT_PRINT_SETTINGS } from "@/app/utils/print/print-settings";
import { printDocument, printHtml } from "@/app/editor/utils/print-note";
import { renderNote } from "@/app/editor/utils/render-note";
import PdfOpenButton from "./PdfOpenButton";
import { PDF_SAMPLE } from "./pdf-sample";

const PANEL = "rounded-xl border border-edge-subtle bg-surface-raised";

interface Page {
  title: string;
  body: string;
}

// The Markdown to PDF tool: Markdown on the left, the printed page on the
// right (stacked on narrow screens), rendered as you type with the editor's
// own exporter (render-note.ts, print-note.ts). Save as PDF opens the
// browser's print dialog. Only text and web images are rendered: there is no
// vault here. The preview is a sandboxed frame, so nothing in it can run.
// The input persists in this tab (atom_pdfToolMarkdown).
export default function MarkdownToPdfTool() {
  const [stored, setInput] = useAtom(atom_pdfToolMarkdown);
  const input = stored ?? PDF_SAMPLE;
  const deferredInput = useDeferredValue(input);
  const [page, setPage] = useState<Page | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let current = true;
    const text = deferredInput;
    if (!text.trim()) {
      setPage(null);
      return;
    }
    renderNote(text, "draft", null, async () => {
      throw new Error("No vault");
    })
      .then(({ title, body }) => {
        if (current) setPage({ title: title ?? "Document", body });
      })
      .catch(() => {
        if (current) setPage(null);
      });
    return () => {
      current = false;
    };
  }, [deferredInput]);

  const print = async () => {
    if (!page) return;
    setPrinting(true);
    try {
      await printHtml(printDocument(page.title, page.body, DEFAULT_PRINT_SETTINGS, printDate()));
    } catch {
      showErrorToast("Couldn't open the print dialog. Try the editor's Export as PDF instead.");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <Textarea
            name="pdf-input"
            label="Markdown"
            value={input}
            handleChange={(event) => setInput(event.target.value)}
            placeholder="Paste Markdown…"
            spellCheck={false}
            textareaClassName="font-mono min-h-[520px] text-ui-footnote"
          />
        </div>
        <div className="min-w-0 flex flex-col gap-1.5 my-2">
          <p className="text-ui-footnote font-medium text-fg-muted px-0.5">Page preview</p>
          <div className={`${PANEL} h-[520px] overflow-hidden`}>
            {page ? (
              <iframe
                title="Page preview"
                sandbox=""
                srcDoc={printDocument(page.title, page.body, DEFAULT_PRINT_SETTINGS, printDate())}
                className="h-full w-full bg-white"
              />
            ) : (
              <p className="p-4 text-ui-subhead text-fg-muted">Paste Markdown to preview it.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={print} isDisabled={!page || printing}>
          Save as PDF
        </Button>
        <PdfOpenButton variant="outlined" />
        <Button variant="outlined" onClick={() => setInput("")} isDisabled={!input}>
          Clear
        </Button>
      </div>
    </div>
  );
}
