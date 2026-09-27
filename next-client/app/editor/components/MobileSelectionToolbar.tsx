"use client";

import React, { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import type { EditorView } from "@codemirror/view";
import { HiOutlineLink } from "react-icons/hi";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import { toggleBold, toggleItalic } from "../codemirror/commands";
import Button from "@/app/components/Button";

type Pos = { top: number; left: number };

// Half the toolbar's width (three buttons) plus a small gutter, used to keep it on screen.
const TOOLBAR_HALF_WIDTH = 64;

// Wraps the selection as `[text]()` and parks the cursor between the parens
// so the URL can be typed straight away.
function wrapAsLink(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const text = view.state.sliceDoc(from, to);
  const insert = `[${text}]()`;
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length - 1 },
    userEvent: "input.format.link",
  });
  return true;
}

// Mobile-only: select text in the active CodeMirror editor and a small
// floating toolbar appears below the selection with Bold/Italic/Link.
// Auto-dismisses when the selection collapses or the editor loses focus.
export default function MobileSelectionToolbar() {
  const view = useAtomValue(atom_activeEditorView);
  const [pos, setPos] = useState<Pos | null>(null);

  useEffect(() => {
    if (!view) {
      setPos(null);
      return;
    }
    const handleSelectionChange = () => {
      const { from, to, empty } = view.state.selection.main;
      if (!view.hasFocus || empty) {
        setPos(null);
        return;
      }
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      if (!start || !end) {
        setPos(null);
        return;
      }
      // Sits below the selection: the native selection menu and the
      // "Ask AI" pill both claim the space above it.
      const center = start.top === end.top ? (start.left + end.right) / 2 : window.innerWidth / 2;
      const left = Math.min(Math.max(TOOLBAR_HALF_WIDTH, center), window.innerWidth - TOOLBAR_HALF_WIDTH);
      setPos({ top: end.bottom + 8, left });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [view]);

  if (!pos || !view) return null;

  const run = (command: (target: EditorView) => boolean) => {
    command(view);
    view.focus();
    setPos(null);
  };

  // Keep the editor focused (and its selection intact) while tapping a button.
  const keepFocus = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();

  return (
    <div
      className="fixed z-50 -translate-x-1/2 flex items-center gap-1 bg-chrome border border-edge px-1.5 py-1"
      style={{ top: pos.top, left: pos.left }}
    >
      <Button variant="unstyled" onPointerDown={keepFocus} onMouseDown={keepFocus} onClick={() => run(toggleBold)} aria-label="Bold" className="px-2 py-1 font-bold text-fg">B</Button>
      <Button variant="unstyled" onPointerDown={keepFocus} onMouseDown={keepFocus} onClick={() => run(toggleItalic)} aria-label="Italic" className="px-2 py-1 italic text-fg">I</Button>
      <Button variant="unstyled" onPointerDown={keepFocus} onMouseDown={keepFocus} onClick={() => run(wrapAsLink)} aria-label="Link" className="px-2 py-1 text-fg">
        <HiOutlineLink size={14} />
      </Button>
    </div>
  );
}
