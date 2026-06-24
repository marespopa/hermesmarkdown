"use client";

import React, { useEffect, useState } from "react";
import { HiOutlineLink } from "react-icons/hi";

type Pos = { top: number; left: number };

// Mobile-only: select text in the editor textarea, a small floating toolbar
// appears above the selection with Bold/Italic/Link. Auto-dismisses when the
// selection collapses or the user taps elsewhere.
export default function MobileSelectionToolbar() {
  const [pos, setPos] = useState<Pos | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const textarea = document.querySelector<HTMLTextAreaElement>(".editor-container textarea");
      if (!textarea || document.activeElement !== textarea) {
        setPos(null);
        return;
      }
      if (textarea.selectionStart === textarea.selectionEnd) {
        setPos(null);
        return;
      }
      const rect = textarea.getBoundingClientRect();
      setPos({ top: rect.top - 44, left: rect.left + rect.width / 2 });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  if (!pos) return null;

  const wrapSelection = (before: string, after: string = before) => {
    const textarea = document.querySelector<HTMLTextAreaElement>(".editor-container textarea");
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    textarea.focus();
    textarea.setSelectionRange(start, end);
    document.execCommand("insertText", false, `${before}${selectedText}${after}`);
    setPos(null);
  };

  return (
    <div
      className="fixed z-50 -translate-x-1/2 flex items-center gap-1 bg-chrome border border-edge px-1.5 py-1"
      style={{ top: Math.max(8, pos.top), left: pos.left }}
    >
      <button type="button" onClick={() => wrapSelection("**")} className="px-2 py-1 font-bold text-fg">B</button>
      <button type="button" onClick={() => wrapSelection("_")} className="px-2 py-1 italic text-fg">I</button>
      <button type="button" onClick={() => wrapSelection("[", "]()")} aria-label="Link" className="px-2 py-1 text-fg">
        <HiOutlineLink size={14} />
      </button>
    </div>
  );
}
