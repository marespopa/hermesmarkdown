"use client";

// PDF.js's own text-layer rules, so the invisible, selectable text lines up
// with the drawn page at every zoom. Loaded with this chunk, only once a PDF opens.
import "pdfjs-dist/web/pdf_viewer.css";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { PDFDocumentProxy, RenderTask, TextLayer } from "pdfjs-dist";
import { loadPdfJs } from "../utils/pdfjs";

interface PdfPageProps {
  pdf: PDFDocumentProxy;
  /** 1-based page number. */
  number: number;
  /** The page's size at scale 1, in CSS pixels. */
  width: number;
  height: number;
  scale: number;
  /** The viewer's scroller, so a page draws only once it is near the view. */
  root: HTMLElement | null;
}

// One PDF page: a white sheet sized before it draws (so scrolling never
// jumps), drawn to a canvas at the screen's pixel density once it comes
// within a screen of the view, with a selectable text layer over it. A zoom
// redraws it; a page scrolled away keeps its last picture.
export default function PdfPage({ pdf, number, width, height, scale, root }: PdfPageProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const drawnScale = useRef<number | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setNear(entries.some((entry) => entry.isIntersecting)),
      { root, rootMargin: "100% 0px" },
    );
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [root]);

  useEffect(() => {
    if (!near || drawnScale.current === scale) return;
    let cancelled = false;
    let render: RenderTask | undefined;
    let text: TextLayer | undefined;
    (async () => {
      const page = await pdf.getPage(number);
      const canvas = canvasRef.current;
      const textLayer = textRef.current;
      if (cancelled || !canvas || !textLayer) return;
      const viewport = page.getViewport({ scale });
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      render = page.render({ canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
      await render.promise;
      if (cancelled) return;
      drawnScale.current = scale;
      const pdfjs = await loadPdfJs();
      if (cancelled) return;
      textLayer.replaceChildren();
      text = new pdfjs.TextLayer({ textContentSource: page.streamTextContent(), container: textLayer, viewport });
      await text.render();
    })().catch(() => {
      // Cancelled by a newer zoom or by closing, or a page PDF.js can't draw:
      // the sheet stays blank rather than breaking the others.
    });
    return () => {
      cancelled = true;
      render?.cancel();
      text?.cancel();
    };
  }, [pdf, number, scale, near]);

  return (
    <div
      ref={sheetRef}
      data-page={number}
      aria-label={`Page ${number}`}
      role="group"
      className="relative mx-auto shrink-0 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.08),0_8px_24px_-12px_rgb(0_0_0/0.3)]"
      style={
        {
          width: width * scale,
          height: height * scale,
          "--scale-factor": scale,
          "--user-unit": 1,
          "--total-scale-factor": scale,
        } as CSSProperties
      }
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div ref={textRef} className="textLayer" />
    </div>
  );
}
