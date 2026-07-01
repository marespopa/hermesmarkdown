"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { HiX } from "react-icons/hi";
import Portal from "../../components/Portal";
import Button from "../../components/Button";

const STORAGE_KEY = "hermes_voice_panel_pos";
const EDGE_PAD = 16;
const DRAG_THRESHOLD = 6;

interface VoicePreviewPanelProps {
  isListening: boolean;
  previewText: string;
  onPreviewTextChange: (text: string) => void;
  interimText: string | null;
  onCommit: () => void;
  onDiscard: () => void;
}

// Dictated speech lands here first, editable, instead of the real document —
// review/fix mishears, then explicitly commit. Shown whenever there's
// anything to review, even after the mic itself has been toggled off, so
// stopping to think doesn't lose what was already said. "Insert" clears the
// buffer but keeps listening/the panel open, so several phrases can be
// reviewed and inserted one after another without re-opening voice input
// each time; only the X (or Escape) stops the mic and closes it outright.
//
// Single instance for the whole app (rendered once, in page.tsx) — dictation
// isn't scoped to any one pane, so switching the active pane mid-utterance
// never closes this or drops the in-progress preview. "Insert" writes into
// whichever pane is currently active.
export default function VoicePreviewPanel({
  isListening,
  previewText,
  onPreviewTextChange,
  interimText,
  onCommit,
  onDiscard,
}: VoicePreviewPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const visible = isListening || previewText.length > 0 || !!interimText;

  useEffect(() => {
    if (visible) textareaRef.current?.focus();
  }, [visible]);

  // Undragged, the panel sits centered via CSS (see `pos === null` below).
  // Once dragged, its position is pinned in pixels and remembered across
  // sessions — same drag pattern as AssistantFab.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const lastDragPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPos(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    const clamp = () => {
      setPos((prev) => {
        if (!prev || !panelRef.current) return prev;
        const { width, height } = panelRef.current.getBoundingClientRect();
        return {
          x: Math.min(prev.x, window.innerWidth - width - EDGE_PAD),
          y: Math.min(prev.y, window.innerHeight - height - EDGE_PAD),
        };
      });
    };
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);

  const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: rect.left,
      startY: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };

    const onMove = (ev: MouseEvent) => {
      const ds = dragState.current;
      if (!ds) return;
      const dx = ev.clientX - ds.startMouseX;
      const dy = ev.clientY - ds.startMouseY;
      if (!ds.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      ds.moved = true;
      setIsDragging(true);
      const nx = Math.max(EDGE_PAD, Math.min(window.innerWidth - ds.width - EDGE_PAD, ds.startX + dx));
      const ny = Math.max(EDGE_PAD, Math.min(window.innerHeight - ds.height - EDGE_PAD, ds.startY + dy));
      lastDragPosRef.current = { x: nx, y: ny };
      setPos({ x: nx, y: ny });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setIsDragging(false);
      if (dragState.current?.moved && lastDragPosRef.current) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(lastDragPosRef.current));
        } catch {}
      }
      dragState.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  if (!visible) return null;

  // The panel stays open after a commit (voice input keeps listening), so
  // focus needs to be put back explicitly — the "stays visible" effect above
  // won't re-fire since `visible` doesn't change across a commit.
  const commitAndRefocus = () => {
    if (!previewText.trim()) return;
    onCommit();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // This panel renders through a Portal, so React's tree-based (not
    // DOM-based) event bubbling would otherwise carry every keystroke here up
    // to the real editor's global shortcut handler (Ctrl+B, quote-continue on
    // Enter, etc.) — which operates on the *document* textarea, not this one.
    // Stopping propagation keeps this box fully isolated from that.
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitAndRefocus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onDiscard();
    }
  };

  return (
    <Portal>
      <div
        ref={panelRef}
        data-voice-preview-panel
        className={`fixed z-[95] w-[min(90vw,32rem)]
          flex flex-col gap-2 rounded-2xl border border-sage/30 bg-paper-light dark:bg-paper-dark-surface
          shadow-lg p-3
          ${pos ? "" : "bottom-20 left-1/2 -translate-x-1/2"}
          ${isDragging ? "shadow-xl" : ""}
        `}
        style={pos ? { left: pos.x, top: pos.y } : undefined}
      >
        <div
          onMouseDown={onHandleMouseDown}
          className={`flex items-center justify-between gap-2 select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <span className="flex items-center gap-2 text-ui-footnote text-sage">
            <span className={`h-1.5 w-1.5 rounded-full bg-sage ${isListening ? "animate-pulse" : "opacity-40"}`} />
            {isListening ? "Listening…" : "Voice input paused"}
          </span>
          <button
            type="button"
            aria-label="Close voice input"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onDiscard}
            className="flex items-center justify-center w-7 h-7 rounded-full text-ink-muted hover:bg-sage/10 hover:text-sage"
          >
            <HiX size={16} />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={previewText}
          onChange={(e) => onPreviewTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Dictated text will appear here for review…"
          rows={3}
          className="w-full resize-none rounded-lg border border-edge bg-transparent p-3 text-ui-body
            text-fg placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        />

        {interimText && <div className="text-ui-footnote italic text-ink-muted px-1">{interimText}</div>}

        <div className="flex justify-end gap-2">
          <Button variant="primary" isDisabled={!previewText.trim()} onClick={commitAndRefocus}>
            Insert
          </Button>
        </div>
      </div>
    </Portal>
  );
}
