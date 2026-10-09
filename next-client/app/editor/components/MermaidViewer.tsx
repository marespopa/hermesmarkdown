"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { HiMinus, HiOutlineArrowsExpand, HiOutlineDownload, HiPlus } from "react-icons/hi";
import Button from "@/app/components/Button";

type DiagramSize = {
  width: number;
  height: number;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

export function getDiagramSize(svg: string): DiagramSize | null {
  const values = svg.match(/\bviewBox=["']([^"']+)["']/i)?.[1].trim().split(/\s+/).map(Number);
  const width = values?.[2];
  const height = values?.[3];

  return typeof width === "number" && Number.isFinite(width) && width > 0
    && typeof height === "number" && Number.isFinite(height) && height > 0
    ? { width, height }
    : null;
}

interface Props {
  svg: string | null;
  loading?: boolean;
  // Shown under the diagram; a diagram still showing is dimmed (the last
  // good render while the source has an error).
  error?: string | null;
  // "always" fits every new diagram to the view; "first" fits the first one
  // and again whenever `fitRequest` changes, so live re-renders keep the
  // reader's zoom.
  fit?: "always" | "first";
  fitRequest?: number;
  className?: string;
  downloadName?: string;
  // Shown when there's nothing to draw.
  emptyText?: string;
}

// A rendered Mermaid diagram with zoom, fit, drag-to-pan and SVG download.
// Used by MermaidDialog and the Mermaid tool page.
export default function MermaidViewer({
  svg,
  loading = false,
  error = null,
  fit = "always",
  fitRequest = 0,
  className = "h-[60vh]",
  downloadName = "diagram.svg",
  emptyText,
}: Props) {
  const [scale, setScale] = useState<number>(1);
  const diagramSize = svg ? getDiagramSize(svg) : null;
  const previewRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fittedRef = useRef<{ request: number } | null>(null);

  const zoomIn = () => setScale((scale) => Math.min(MAX_ZOOM, scale * 1.25));
  const zoomOut = () => setScale((scale) => Math.max(MIN_ZOOM, scale / 1.25));
  const fitWidth = useCallback(() => {
    const previewBounds = previewRef.current?.getBoundingClientRect();
    const diagramBounds = diagramRef.current?.getBoundingClientRect();

    if (!previewBounds || !diagramBounds || !diagramBounds.width || !diagramBounds.height) return;

    const availableWidth = previewBounds.width - 32;
    const availableHeight = previewBounds.height - 32;
    const fitRatio = Math.min(availableWidth / diagramBounds.width, availableHeight / diagramBounds.height);
    setScale((scale) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale * fitRatio)));
    previewRef.current?.scrollTo({ left: 0, top: 0 });
  }, []);

  useEffect(() => {
    if (!svg || !diagramSize) return;
    if (fit === "first" && fittedRef.current?.request === fitRequest) return;
    fittedRef.current = { request: fitRequest };

    let fitFrame = 0;
    const layoutFrame = requestAnimationFrame(() => {
      fitFrame = requestAnimationFrame(fitWidth);
    });
    return () => {
      cancelAnimationFrame(layoutFrame);
      cancelAnimationFrame(fitFrame);
    };
    // diagramSize is derived from svg.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg, fit, fitRequest, fitWidth]);

  const downloadSVG = () => {
    if (!svg || typeof document === "undefined") return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
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
    <div className="w-full min-w-0 space-y-2">
      <div
        ref={previewRef}
        className={`relative overflow-auto bg-paper-light/50 dark:bg-paper-dark/40 rounded-md p-4 touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${className}`}
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {loading && !svg && <div className="flex items-center justify-center h-full">Rendering…</div>}
        {!loading && !svg && !error && emptyText && (
          <div className="flex items-center justify-center h-full text-fg-muted">{emptyText}</div>
        )}
        {svg && (
          <div
            ref={diagramRef}
            className={`[&_svg]:block [&_svg]:h-full [&_svg]:max-w-none [&_svg]:w-full transition-opacity ${error ? "opacity-40" : ""}`}
            style={diagramSize ? { width: diagramSize.width * scale, height: diagramSize.height * scale } : undefined}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
        {svg && (
          <div className="sticky bottom-0 left-1/2 z-10 flex w-fit -translate-x-1/2 items-center gap-1 rounded-md border border-edge bg-paper-light p-1 shadow-sm dark:bg-paper-dark">
            <Button variant="pill-icon" onClick={zoomOut} aria-label="Zoom out" title="Zoom out"><HiMinus size={16} /></Button>
            <span className="min-w-11 text-center text-ui-caption text-ink-muted dark:text-stone">{Math.round(scale * 100)}%</span>
            <Button variant="pill-icon" onClick={zoomIn} aria-label="Zoom in" title="Zoom in"><HiPlus size={16} /></Button>
            <Button variant="pill-icon" onClick={fitWidth} aria-label="Fit entire diagram" title="Fit diagram"><HiOutlineArrowsExpand size={16} /></Button>
            <Button variant="pill-icon" onClick={downloadSVG} aria-label="Download diagram" title="Download SVG"><HiOutlineDownload size={16} /></Button>
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-ui-footnote text-accent whitespace-pre-wrap break-words">{error}</p>}
    </div>
  );
}
