"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { HiMinus, HiOutlineArrowsExpand, HiOutlineDownload, HiPlus } from "react-icons/hi";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";

type MermaidTheme =
  | "default"
  | "base"
  | "dark"
  | "forest"
  | "neutral"
  | "neo"
  | "neo-dark"
  | "redux"
  | "redux-dark"
  | "redux-color"
  | "redux-dark-color"
  | "null";

type DiagramSize = {
  width: number;
  height: number;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

function getDiagramSize(svg: string): DiagramSize | null {
  const values = svg.match(/\bviewBox=["']([^"']+)["']/i)?.[1].trim().split(/\s+/).map(Number);
  const width = values?.[2];
  const height = values?.[3];

  return Number.isFinite(width) && width! > 0 && Number.isFinite(height) && height! > 0
    ? { width, height }
    : null;
}

const normalizeTheme = (theme?: string): MermaidTheme => {
  const validThemes: MermaidTheme[] = [
    "default",
    "base",
    "dark",
    "forest",
    "neutral",
    "neo",
    "neo-dark",
    "redux",
    "redux-dark",
    "redux-color",
    "redux-dark-color",
    "null",
  ];
  return validThemes.includes(theme as MermaidTheme) ? (theme as MermaidTheme) : "default";
};

export default function MermaidDialog() {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [diagramSize, setDiagramSize] = useState<DiagramSize | null>(null);
  const lastDetailRef = useRef<{ source: string; theme: MermaidTheme } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const detail = ce.detail as { source: string; theme?: string };
      if (!detail || !detail.source) return;
      const theme = normalizeTheme(detail.theme);
      lastDetailRef.current = { source: detail.source, theme };
      openAndRender(detail.source, theme);
    };
    document.addEventListener("hermes:open-mermaid-dialog", handler as EventListener);
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("hermes:open-mermaid-dialog", handler as EventListener);
      }
    };
  }, []);

  const openAndRender = async (source: string, theme: MermaidTheme) => {
    setOpen(true);
    setLoading(true);
    setError(null);
    setSvg(null);
    setScale(1);
    setDiagramSize(null);
    try {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme, securityLevel: "strict" });
      const { svg: rendered } = await mermaid.render(`mermaid-dialog-${Date.now()}`, source);
      setSvg(rendered);
      setDiagramSize(getDiagramSize(rendered));
    } catch (err: any) {
      setError(err?.message || "Failed to render diagram");
    } finally {
      setLoading(false);
    }
  };

  const zoomIn = () => setScale((scale) => Math.min(MAX_ZOOM, scale * 1.25));
  const zoomOut = () => setScale((scale) => Math.max(MIN_ZOOM, scale / 1.25));
  const fitWidth = useCallback(() => {
    const previewBounds = previewRef.current?.getBoundingClientRect();
    const diagramBounds = diagramRef.current?.getBoundingClientRect();

    if (!previewBounds || !diagramBounds.width || !diagramBounds.height) return;

    const availableWidth = previewBounds.width - 32;
    const availableHeight = previewBounds.height - 32;
    const fitRatio = Math.min(availableWidth / diagramBounds.width, availableHeight / diagramBounds.height);
    setScale((scale) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale * fitRatio)));
    previewRef.current?.scrollTo({ left: 0, top: 0 });
  }, []);

  useEffect(() => {
    if (!svg || !diagramSize) return;

    let fitFrame = 0;
    const layoutFrame = requestAnimationFrame(() => {
      fitFrame = requestAnimationFrame(fitWidth);
    });
    return () => {
      cancelAnimationFrame(layoutFrame);
      cancelAnimationFrame(fitFrame);
    };
  }, [diagramSize, fitWidth, svg]);

  const downloadSVG = () => {
    if (!svg || typeof document === "undefined") return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest("button")) return;

    const preview = event.currentTarget;
    preview.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: preview.scrollLeft,
      scrollTop: preview.scrollTop,
    };
    setIsDragging(true);
  };

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    event.currentTarget.scrollLeft = start.scrollLeft - (event.clientX - start.x);
    event.currentTarget.scrollTop = start.scrollTop - (event.clientY - start.y);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <DialogModal
      isOpened={open}
      onClose={() => setOpen(false)}
      styles="!max-w-[1200px] !rounded-3xl !backdrop-blur-lg"
    >
      <div className="w-full min-w-0">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Mermaid Diagram</h3>
        </div>
        <div
          ref={previewRef}
          className={`relative h-[60vh] overflow-auto bg-paper-light/50 dark:bg-paper-dark/40 rounded-md p-4 touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {loading && <div className="flex items-center justify-center h-full">Rendering…</div>}
          {error && <div className="text-red-500">{error}</div>}
          {svg && (
            <div
              ref={diagramRef}
              className="[&_svg]:block [&_svg]:h-full [&_svg]:max-w-none [&_svg]:w-full"
              style={diagramSize ? { width: diagramSize.width * scale, height: diagramSize.height * scale } : undefined}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
          {svg && (
            <div className="sticky bottom-0 left-1/2 z-10 flex w-fit -translate-x-1/2 items-center gap-1 rounded-md border border-edge bg-paper-light p-1 shadow-sm dark:bg-paper-dark">
              <Button variant="pill-icon" onClick={zoomOut} aria-label="Zoom out" title="Zoom out"><HiMinus size={16} /></Button>
              <span className="min-w-11 text-center text-ui-micro text-ink-muted dark:text-stone">{Math.round(scale * 100)}%</span>
              <Button variant="pill-icon" onClick={zoomIn} aria-label="Zoom in" title="Zoom in"><HiPlus size={16} /></Button>
              <Button variant="pill-icon" onClick={fitWidth} aria-label="Fit entire diagram" title="Fit diagram"><HiOutlineArrowsExpand size={16} /></Button>
              <Button variant="pill-icon" onClick={downloadSVG} aria-label="Download diagram" title="Download SVG"><HiOutlineDownload size={16} /></Button>
            </div>
          )}
        </div>
      </div>
    </DialogModal>
  );
}
