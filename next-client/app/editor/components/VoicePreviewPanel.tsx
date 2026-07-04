"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { HiX, HiOutlineQuestionMarkCircle, HiChevronDown, HiChevronUp } from "react-icons/hi";
import Portal from "../../components/Portal";
import Button from "../../components/Button";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import useKeyboardInset from "@/app/hooks/use-keyboard-inset";
import { SHORTCODES } from "./constants";
import { VOICE_COMMAND_HELP } from "../utils/voice-command-parser";

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
  const isMobileChrome = useIsMobileChrome();

  useEffect(() => {
    // On mobile, focusing pops the on-screen keyboard — but dictation needs
    // no caret, and the keyboard has no way to fit alongside this panel on a
    // small screen. Only autofocus on desktop; mobile users can still tap in
    // to edit manually, at which point the keyboard-avoidance below kicks in.
    if (visible && !isMobileChrome) textareaRef.current?.focus();
  }, [visible, isMobileChrome]);

  // Tracks how much the on-screen keyboard has eaten into the viewport, so
  // the panel can lift itself clear instead of being rendered underneath it
  // (a `fixed bottom-*` element doesn't move on its own when the keyboard
  // opens on most mobile browsers).
  const keyboardInset = useKeyboardInset();

  // What's actually painted in the textarea. Lags behind `previewText` when
  // a new voice chunk lands, so it can be revealed with a typewriter effect.
  // Manual edits (typing directly in the box) update this synchronously in
  // the same tick as the keystroke (see handlePreviewChange), so by the time
  // `previewText` itself changes to match, this effect's early-return above
  // already skips it — no animation for anything the user typed themselves.
  const [displayedText, setDisplayedText] = useState(previewText);
  const typewriterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (previewText === displayedText) return;

    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }

    // Not a simple append (discard/replace-previous/delete-last) — nothing
    // sensible to "type out", just snap to the new value.
    if (!previewText.startsWith(displayedText)) {
      setDisplayedText(previewText);
      return;
    }

    let i = displayedText.length;
    typewriterTimerRef.current = setInterval(() => {
      i++;
      setDisplayedText(previewText.slice(0, i));
      if (i >= previewText.length && typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
      }
    }, 18);

    return () => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewText]);

  // Always keep the newest dictated/typed text in view rather than leaving
  // the scroll position wherever it was when the box last had focus.
  useEffect(() => {
    const el = textareaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayedText, interimText]);

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
    // On mobile there's no drag affordance (touch just taps), so a pos
    // saved from a desktop session must never carry over — always centered.
    if (isMobileChrome) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPos(JSON.parse(raw));
    } catch {}
  }, [isMobileChrome]);

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
    if (e.button !== 0 || isMobileChrome) return;
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
  }, [isMobileChrome]);

  const [showCommands, setShowCommands] = useState(false);

  if (!visible) return null;

  const effectivePos = isMobileChrome ? null : pos;

  // The panel stays open after a commit (voice input keeps listening), so
  // focus needs to be put back explicitly — the "stays visible" effect above
  // won't re-fire since `visible` doesn't change across a commit.
  const commitAndRefocus = () => {
    if (!previewText.trim()) return;
    onCommit();
    textareaRef.current?.focus();
  };

  // Same inline "..d" / "{date}" / etc. expansion the main editor supports —
  // this box is a plain textarea (not react-simple-code-editor), so it needs
  // its own copy of the SHORTCODES check instead of inheriting it for free.
  const handlePreviewChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const val = textarea.value;
    const start = textarea.selectionStart;

    for (const [code, getValue] of Object.entries(SHORTCODES)) {
      const sliceStart = Math.max(0, start - code.length);
      if (val.substring(sliceStart, start) === code) {
        const replacement = getValue();
        textarea.setSelectionRange(sliceStart, start);
        document.execCommand("insertText", false, replacement);
        setDisplayedText(textarea.value);
        onPreviewTextChange(textarea.value);
        return;
      }
    }

    setDisplayedText(val);
    onPreviewTextChange(val);
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
          ${effectivePos ? "" : "left-1/2 -translate-x-1/2"}
          ${isDragging ? "shadow-xl" : ""}
        `}
        style={
          effectivePos
            ? { left: effectivePos.x, top: effectivePos.y }
            : { bottom: keyboardInset > 0 ? keyboardInset + EDGE_PAD : 80 }
        }
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
          value={displayedText}
          onChange={handlePreviewChange}
          onKeyDown={handleKeyDown}
          placeholder="Dictated text will appear here for review…"
          rows={3}
          className="w-full resize-none rounded-lg border border-edge bg-transparent p-3 text-ui-body
            text-fg placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        />

        {interimText && <div className="text-ui-footnote italic text-ink-muted px-1">{interimText}</div>}

        {showCommands && (
          <div className="rounded-lg border border-edge bg-paper-pale dark:bg-paper-dark max-h-40 overflow-y-auto">
            {VOICE_COMMAND_HELP.map((cmd) => (
              <div
                key={cmd.phrase}
                className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-ui-caption border-b border-edge-subtle last:border-b-0"
              >
                <span className="font-mono text-ink-light dark:text-ink-dark truncate">{cmd.phrase}</span>
                <span className="text-ink-muted shrink-0">{cmd.result}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowCommands((v) => !v)}
            aria-expanded={showCommands}
            aria-label="Show voice commands"
            className={`flex items-center gap-1 text-ui-caption transition-colors ${
              showCommands ? "text-sage" : "text-ink-muted hover:text-sage"
            }`}
          >
            <HiOutlineQuestionMarkCircle size={16} />
            Commands
            {showCommands ? <HiChevronUp size={12} /> : <HiChevronDown size={12} />}
          </button>
          <div className="flex items-center gap-2">
            {isListening && (
              <Button variant="outlined" onClick={onDiscard}>
                Stop Listening
              </Button>
            )}
            <Button variant="primary" isDisabled={!previewText.trim()} onClick={commitAndRefocus}>
              Insert
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
