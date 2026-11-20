"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAtomValue } from "jotai";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { HiMinus, HiPlus } from "react-icons/hi";
import Button from "@/app/components/Button/Button.component";
import { atom_vaultHandle } from "@/app/atoms/atoms";
import { resolveFileHandleAtPath } from "@/app/atoms/vault-atoms";
import { isPasswordError, loadPdfJs } from "../utils/pdfjs";
import PdfPage from "./PdfPage";

interface PdfViewerProps {
  /** Vault path of the PDF. */
  path: string;
}

type Loaded = { path: string; pdf: PDFDocumentProxy; sizes: { width: number; height: number }[] };
type Failed = { path: string; error: string };

const ZOOMS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
// Fitted pages are never wider than a comfortable reading column.
const MAX_FIT_WIDTH = 960;
const GUTTER = 48;

const nextZoom = (zoom: number, step: 1 | -1) =>
  step === 1 ? ZOOMS.find((z) => z > zoom + 0.001) ?? zoom : [...ZOOMS].reverse().find((z) => z < zoom - 0.001) ?? zoom;

// An opened PDF, read-only: its pages in one scrolling column, fitted to the
// pane's width, each drawn by PDF.js (loaded only now) once it nears the view,
// with selectable text. A small bar shows the page in view and zooms (also
// Ctrl/Cmd +, − and 0 while the PDF has focus). The file is read from the
// vault each time the path changes; nothing is written back. Keyed by path
// (PaneLeaf), so another PDF opens at the top, fitted.
export default function PdfViewer({ path }: PdfViewerProps) {
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const [doc, setDoc] = useState<Loaded | Failed | null>(null);
  const [zoom, setZoom] = useState(1);
  const [paneWidth, setPaneWidth] = useState(0);
  const [pageInView, setPageInView] = useState(1);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const pagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    // Destroying the loading task frees the document and its worker-side copy.
    let task: { destroy: () => Promise<void> } | undefined;
    (async () => {
      try {
        if (!vaultHandle) throw new Error("No vault");
        const [file, pdfjs] = await Promise.all([
          resolveFileHandleAtPath(vaultHandle, path).then((handle) => handle.getFile()),
          loadPdfJs(),
        ]);
        const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        task = loading;
        if (cancelled) return void loading.destroy();
        const opened = await loading.promise;
        const pages = await Promise.all(
          Array.from({ length: opened.numPages }, (_, index) => opened.getPage(index + 1)),
        );
        const sizes = pages.map((page) => {
          const { width, height } = page.getViewport({ scale: 1 });
          return { width, height };
        });
        if (!cancelled) setDoc({ path, pdf: opened, sizes });
      } catch (error) {
        if (!cancelled) {
          setDoc({
            path,
            error: isPasswordError(error) ? "This PDF is protected by a password and can't be shown." : "This PDF can't be shown.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [vaultHandle, path]);

  // The pane's width, for fitting the pages.
  useEffect(() => {
    if (!scroller || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setPaneWidth(entry.contentRect.width));
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scroller]);

  // The page whose sheet crosses the upper third of the pane.
  const onScroll = useCallback(() => {
    const pages = pagesRef.current;
    if (!scroller || !pages) return;
    const line = scroller.getBoundingClientRect().top + scroller.clientHeight / 3;
    for (const sheet of Array.from(pages.children) as HTMLElement[]) {
      if (sheet.getBoundingClientRect().bottom >= line) {
        setPageInView(Number(sheet.dataset.page) || 1);
        return;
      }
    }
  }, [scroller]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (event.key === "=" || event.key === "+") setZoom((z) => nextZoom(z, 1));
    else if (event.key === "-") setZoom((z) => nextZoom(z, -1));
    else if (event.key === "0") setZoom(1);
    else return;
    // Ahead of the browser's page zoom and the sidebar's Ctrl/Cmd+0.
    event.preventDefault();
  };

  const current = doc?.path === path ? doc : null;
  if (!current) {
    return (
      <div role="status" aria-label={`Opening ${path}…`} className="flex h-full items-center justify-center">
        <span className="loading-bar-appear h-4 w-4 animate-spin rounded-full border-[1.5px] border-fg-faint border-t-transparent motion-reduce:animate-none" />
      </div>
    );
  }
  if ("error" in current) return <p role="alert" className="p-6 text-sm text-fg-faint">{current.error}</p>;

  const widest = Math.max(...current.sizes.map((size) => size.width), 1);
  const fit = paneWidth ? Math.min(paneWidth - GUTTER, MAX_FIT_WIDTH) / widest : 1;
  const scale = Math.max(fit, 0.1) * zoom;
  const name = path.split("/").pop() ?? path;

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={setScroller}
        tabIndex={0}
        role="document"
        aria-label={name}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        className="min-h-0 flex-1 overflow-auto outline-none"
      >
        <div ref={pagesRef} className="flex w-max min-w-full flex-col items-center gap-4 px-6 pb-20 pt-6">
          {current.sizes.map((size, index) => (
            <PdfPage key={index} pdf={current.pdf} number={index + 1} width={size.width} height={size.height} scale={scale} root={scroller} />
          ))}
        </div>
      </div>
      <div className="glass-panel pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-edge-subtle px-1.5 py-1 font-sans text-ui-footnote text-fg-muted shadow-lg">
        <span aria-live="polite" className="px-2 tabular-nums">
          {pageInView} / {current.sizes.length}
        </span>
        <Button variant="icon-small" aria-label="Zoom out" title="Zoom out" onClick={() => setZoom((z) => nextZoom(z, -1))} disabled={zoom <= ZOOMS[0]}>
          <HiMinus size={14} aria-hidden="true" />
        </Button>
        <Button variant="small" aria-label="Fit to width" title="Fit to width" onClick={() => setZoom(1)} className="tabular-nums">
          {Math.round(zoom * 100)}%
        </Button>
        <Button variant="icon-small" aria-label="Zoom in" title="Zoom in" onClick={() => setZoom((z) => nextZoom(z, 1))} disabled={zoom >= ZOOMS[ZOOMS.length - 1]}>
          <HiPlus size={14} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
