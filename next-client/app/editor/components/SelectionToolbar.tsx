"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import type { EditorView } from "@codemirror/view";
import { HiOutlineChatAlt2, HiOutlineLink } from "react-icons/hi";
import Portal from "@/app/components/Portal/Portal";
import Button from "@/app/components/Button";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import { formatShortcut } from "@/app/utils/platform";
import useKeyboardInset from "@/app/hooks/use-keyboard-inset";
import { toggleBold, toggleItalic } from "../codemirror/commands";
import { wrapAsLink } from "../codemirror/format-shortcuts";
import BlockTypeMenu from "./BlockTypeMenu";

interface SelectionToolbarProps {
  /**
   * "above": over the selection (desktop). "docked": centred at the bottom of
   * the screen, above the keyboard (touch), clear of the selection handles
   * and the browser's own Copy/Paste bar.
   */
  placement: "above" | "docked";
  /** Opens AI Chat with the selection. Omit to hide Ask AI (AI not configured). */
  onAsk?: () => void;
  isAiLoading?: boolean;
}

type Pos = { top: number; left: number };

const GAP = 8;
const TOOLBAR_HEIGHT = 36;
// Estimated half-widths for keeping the pill on screen before it's measured.
const HALF_WIDTH_FORMAT_ONLY = 96;
const HALF_WIDTH_WITH_ASK = 144;

const FORMAT_BUTTON_CLASS =
  "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-ui-subhead text-fg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors";

// Floating toolbar on a text selection in the active editor: a "Turn into"
// block-type menu, Bold, Italic, Link, and Ask AI when AI is configured. Shared
// by desktop (over the selection) and mobile (docked above the keyboard);
// hides when the selection collapses or the editor loses focus.
export default function SelectionToolbar({ placement, onAsk, isAiLoading = false }: SelectionToolbarProps) {
  const view = useAtomValue(atom_activeEditorView);
  const viewRef = useRef(view);
  viewRef.current = view;
  const [pos, setPos] = useState<Pos | null>(null);
  const halfWidth = onAsk ? HALF_WIDTH_WITH_ASK : HALF_WIDTH_FORMAT_ONLY;
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const current = viewRef.current;
      if (!current || !current.hasFocus) {
        setPos(null);
        return;
      }
      const { from, to } = current.state.selection.main;
      if (from === to || !current.state.sliceDoc(from, to).trim()) {
        setPos(null);
        return;
      }
      if (placement === "docked") {
        setPos({ top: 0, left: 0 });
        return;
      }
      const start = current.coordsAtPos(from);
      const end = current.coordsAtPos(to);
      if (!start || !end) {
        setPos(null);
        return;
      }
      const center = start.top === end.top ? (start.left + end.right) / 2 : window.innerWidth / 2;
      const left = Math.min(Math.max(halfWidth + GAP, center), window.innerWidth - halfWidth - GAP);
      setPos({ top: Math.max(GAP, start.top - TOOLBAR_HEIGHT - GAP), left });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    document.addEventListener("selectionchange", schedule);
    window.addEventListener("keyup", schedule);
    window.addEventListener("mouseup", schedule);
    // Touch selection (double-tap, dragging handles) lands after the tap ends.
    window.addEventListener("touchend", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    update();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", schedule);
      window.removeEventListener("keyup", schedule);
      window.removeEventListener("mouseup", schedule);
      window.removeEventListener("touchend", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [view, placement, halfWidth]);

  if (!pos || !view) return null;

  const run = (command: (target: EditorView) => boolean) => {
    command(view);
    view.focus();
  };

  // Keep the editor focused (and its selection intact) while pressing a button.
  const keepFocus = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();
  const formatButton = (label: string, title: string, command: (target: EditorView) => boolean, content: React.ReactNode, className = "") => (
    <Button
      variant="unstyled"
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
      onClick={() => run(command)}
      aria-label={label}
      title={title}
      className={`${FORMAT_BUTTON_CLASS} ${className}`}
    >
      {content}
    </Button>
  );

  return (
    <Portal>
      {/* Centering transform on the wrapper so the entry animation can't override it. */}
      <div
        className="fixed z-[99] -translate-x-1/2"
        style={placement === "docked"
          ? { bottom: keyboardInset + 12, left: "50%" }
          : { top: pos.top, left: pos.left }}
      >
        <div
          role="toolbar"
          aria-label="Format selection"
          className="selection-toolbar flex items-center gap-0.5 rounded-full border border-edge bg-chrome p-1 shadow-sm select-none animate-in fade-in zoom-in-95 duration-150"
        >
          <BlockTypeMenu view={view} keepFocus={keepFocus} opensUp={placement === "docked"} />
          <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-edge" />
          {formatButton("Bold", `Bold (${formatShortcut("B")})`, toggleBold, "B", "font-bold")}
          {formatButton("Italic", `Italic (${formatShortcut("I")})`, toggleItalic, "I", "italic font-serif")}
          {formatButton("Link", `Link (${formatShortcut("L", { shift: true })})`, wrapAsLink, <HiOutlineLink size={15} />)}
          {onAsk && !isAiLoading && (
            <>
              <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-edge" />
              <Button
                variant="unstyled"
                onPointerDown={keepFocus}
                onMouseDown={keepFocus}
                onClick={onAsk}
                className="flex h-7 items-center gap-1.5 rounded-full px-3 text-ui-footnote font-medium text-sage hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
              >
                <HiOutlineChatAlt2 size={13} />
                Ask AI
              </Button>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
