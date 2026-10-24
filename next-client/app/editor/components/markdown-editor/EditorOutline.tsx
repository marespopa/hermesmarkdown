"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";

// The strip's width (CSS px); the editor keeps this much room on its right
// (MarkdownEditor's `sm:pr-20`).
export const MINIMAP_WIDTH = 72;
// The most a line takes on the map, and each character's width.
const MAX_LINE_PX = 3;
const CHAR_PX = 0.8;
const INSET_PX = 6;
// The smallest the visible-area slider gets, so it stays easy to grab.
const MIN_SLIDER_PX = 12;

// Where the map draws each line: one row per document line, MAX_LINE_PX
// tall, or squeezed so the whole note fits the strip's height.
export function minimapLineHeight(lineCount: number, height: number): number {
  return lineCount > 0 ? Math.min(MAX_LINE_PX, height / lineCount) : MAX_LINE_PX;
}

// The document lines the pane shows, top and bottom (1-based), worked out
// from the pane's scroll (the editor scrolls in its pane, not in itself).
function visibleLines(view: EditorView, scroller: HTMLElement): { top: number; bottom: number } {
  const docTop = view.documentTop - scroller.getBoundingClientRect().top + scroller.scrollTop;
  const at = (y: number) => view.state.doc.lineAt(view.lineBlockAtHeight(Math.max(0, y - docTop)).from).number;
  return { top: at(scroller.scrollTop), bottom: at(scroller.scrollTop + scroller.clientHeight) };
}

// A code editor's minimap, off by default (atom_showMinimap; Ctrl/Cmd+Shift+M,
// Settings → Editor → View): a narrow strip down the pane's right edge with
// the note drawn small, each run of text a faint bar and headings stronger,
// and a slider over the part on screen. A click or drag on it scrolls the
// pane there, centred. It stays put while the pane scrolls (sticky) and
// redraws on edits, resizes and theme changes. Colours come from the
// strip's own text colour, so it follows the theme.
export default function EditorMinimap({ view, scrollerRef, text }: { view: EditorView | null; scrollerRef: React.RefObject<HTMLDivElement | null>; text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [height, setHeight] = useState(0);
  const [slider, setSlider] = useState<{ top: number; height: number } | null>(null);
  const [themeTick, setThemeTick] = useState(0);
  const dragging = useRef(false);

  // The strip is as tall as the pane.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // Called once on observe too, with the first size.
    const observer = new ResizeObserver(() => setHeight(scroller.clientHeight));
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scrollerRef]);

  // A theme switch changes the colours: redraw.
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((tick) => tick + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => observer.disconnect();
  }, []);

  // The note, drawn small.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(MINIMAP_WIDTH * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, MINIMAP_WIDTH, height);
    context.fillStyle = getComputedStyle(canvas).color;
    const lines = text.split("\n");
    const lineHeight = minimapLineHeight(lines.length, height);
    const barHeight = Math.max(lineHeight * 0.6, 0.5);
    const maxChars = (MINIMAP_WIDTH - INSET_PX * 2) / CHAR_PX;
    lines.forEach((line, index) => {
      context.globalAlpha = /^#{1,6}\s/.test(line) ? 0.9 : 0.4;
      const y = index * lineHeight;
      for (const run of line.matchAll(/\S+/g)) {
        const start = run.index ?? 0;
        if (start >= maxChars) break;
        const length = Math.min(run[0].length, maxChars - start);
        context.fillRect(INSET_PX + start * CHAR_PX, y, length * CHAR_PX, barHeight);
      }
    });
    context.globalAlpha = 1;
  }, [text, height, themeTick]);

  // The slider follows the pane's scroll and the note's edits.
  const updateSlider = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!view || !scroller || !height) return;
    const { top, bottom } = visibleLines(view, scroller);
    const lineHeight = minimapLineHeight(view.state.doc.lines, height);
    const size = Math.max(MIN_SLIDER_PX, (bottom - top + 1) * lineHeight);
    setSlider({ top: Math.min((top - 1) * lineHeight, height - size), height: size });
  }, [view, scrollerRef, height]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const frame = requestAnimationFrame(updateSlider);
    scroller.addEventListener("scroll", updateSlider, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", updateSlider);
    };
  }, [scrollerRef, updateSlider, text]);

  // Scrolls the pane so the line under the pointer sits in its middle.
  const scrollToPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!view || !scroller || !height) return;
    const doc = view.state.doc;
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top;
    const number = Math.min(doc.lines, Math.max(1, Math.floor(y / minimapLineHeight(doc.lines, height)) + 1));
    const block = view.lineBlockAt(doc.line(number).from);
    const docTop = view.documentTop - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTop = docTop + block.top - scroller.clientHeight / 2;
  };

  return (
    // A zero-height sticky box at the top of the scrolling pane holds the
    // strip in place while the note scrolls under it.
    <div className="pointer-events-none sticky top-0 z-10 h-0 max-sm:hidden">
      <div
        role="scrollbar"
        aria-label="Minimap"
        aria-orientation="vertical"
        aria-controls="md-editor"
        aria-valuemin={1}
        aria-valuemax={view?.state.doc.lines ?? 1}
        aria-valuenow={slider && view ? Math.round(slider.top / minimapLineHeight(view.state.doc.lines, height)) + 1 : 1}
        onPointerDown={(event) => {
          event.preventDefault();
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          scrollToPointer(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) scrollToPointer(event);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        style={{ width: MINIMAP_WIDTH, height }}
        className="group/minimap pointer-events-auto absolute right-0 top-0 cursor-default select-none text-fg-muted"
      >
        <canvas ref={canvasRef} aria-hidden="true" style={{ width: MINIMAP_WIDTH, height }} className="block" />
        {slider && (
          <div
            aria-hidden="true"
            style={{ top: slider.top, height: slider.height }}
            className="absolute inset-x-0 bg-fill opacity-60 transition-opacity group-hover/minimap:opacity-100"
          />
        )}
      </div>
    </div>
  );
}
