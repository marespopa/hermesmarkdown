"use client";

import React, { useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { HiCheck, HiChevronDown } from "react-icons/hi";
import Button from "@/app/components/Button";
import { blockTypeAt, setBlockType, type BlockType } from "../codemirror/block-type";

interface BlockTypeMenuProps {
  view: EditorView;
  /** Prevents the default on pointer/mouse down, keeping the editor's focus and selection. */
  keepFocus: (e: React.PointerEvent | React.MouseEvent) => void;
  /** Opens the menu above the trigger (docked toolbar at the screen's bottom). */
  opensUp?: boolean;
}

const OPTIONS: { type: BlockType; label: string; glyph: string }[] = [
  { type: "text", label: "Text", glyph: "Aa" },
  { type: "h1", label: "Heading 1", glyph: "H1" },
  { type: "h2", label: "Heading 2", glyph: "H2" },
  { type: "h3", label: "Heading 3", glyph: "H3" },
  { type: "bullet", label: "Bulleted list", glyph: "•" },
  { type: "numbered", label: "Numbered list", glyph: "1." },
  { type: "todo", label: "To-do list", glyph: "☐" },
  { type: "quote", label: "Quote", glyph: "❝" },
];

const TRIGGER_LABEL: Record<BlockType, string> = {
  text: "Text", h1: "H1", h2: "H2", h3: "H3", h4: "H4", h5: "H5", h6: "H6",
  bullet: "List", numbered: "Numbered", todo: "To-do", quote: "Quote",
};

// The selection toolbar's "Turn into" dropdown: names the current line's
// block type and turns the selected lines into another one.
export default function BlockTypeMenu({ view, keepFocus, opensUp = false }: BlockTypeMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = blockTypeAt(view.state);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [open]);

  const choose = (type: BlockType) => {
    setBlockType(type)(view);
    view.focus();
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="unstyled"
        onPointerDown={keepFocus}
        onMouseDown={keepFocus}
        onClick={() => setOpen((value) => !value)}
        aria-label="Turn into"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Turn into"
        className="flex h-7 items-center gap-1 rounded-full pl-2.5 pr-2 text-ui-footnote font-medium text-fg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
      >
        {TRIGGER_LABEL[current]}
        <HiChevronDown size={12} className="text-fg-muted" />
      </Button>
      {open && (
        <div
          role="menu"
          aria-label="Turn into"
          className={`absolute left-0 ${opensUp ? "bottom-full mb-2" : "top-full mt-2"} w-48 rounded-xl border border-edge bg-chrome p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100`}
        >
          <p className="px-2.5 pb-1 pt-1.5 text-ui-caption font-medium text-fg-muted">Turn into</p>
          {OPTIONS.map((option) => (
            <Button
              key={option.type}
              variant="unstyled"
              role="menuitemradio"
              aria-checked={option.type === current}
              onPointerDown={keepFocus}
              onMouseDown={keepFocus}
              onClick={() => choose(option.type)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-ui-footnote text-fg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
            >
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-edge text-ui-caption font-semibold text-fg-muted">
                {option.glyph}
              </span>
              <span className="flex-1">{option.label}</span>
              {option.type === current && <HiCheck size={14} aria-hidden="true" className="text-fg-muted" />}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
