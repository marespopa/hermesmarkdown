"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { countWords } from "@/app/editor/utils/count-words";

// How long typing has to stop (ms) before the count comes back.
export const WORD_COUNT_PAUSE = 1500;

// The note's word count, a faint pill in the pane's bottom-left corner. It
// steps aside while you type and returns when you pause or move the mouse, so
// it never moves while you're writing. The count is only worked out while the
// pill shows, so typing in a long note costs nothing.
export default function WordCountPill({ view, text }: { view: EditorView | null; text: string }) {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!view) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      clearTimeout(timer);
      setTyping(false);
    };
    // `beforeinput`: every way text goes in (keys, IME, a phone's keyboard),
    // never a shortcut.
    const onBeforeInput = () => {
      setTyping(true);
      clearTimeout(timer);
      timer = setTimeout(settle, WORD_COUNT_PAUSE);
    };
    view.dom.addEventListener("beforeinput", onBeforeInput);
    document.addEventListener("mousemove", settle);
    return () => {
      clearTimeout(timer);
      view.dom.removeEventListener("beforeinput", onBeforeInput);
      document.removeEventListener("mousemove", settle);
    };
  }, [view]);

  const [shown, setShown] = useState(0);
  const count = useMemo(() => (typing ? null : countWords(text)), [typing, text]);
  useEffect(() => {
    if (count !== null) setShown(count);
  }, [count]);

  const visible = !typing && shown > 0;
  return (
    <div className="pointer-events-none sticky bottom-0 z-10 h-0">
      <div
        role="status"
        aria-hidden={!visible}
        className={`absolute bottom-4 left-4 rounded-full glass-panel px-2.5 py-0.5 text-ui-caption tabular-nums text-fg-muted
          transition-opacity duration-300 ${visible ? "opacity-70" : "opacity-0"}`}
      >
        {shown.toLocaleString("en-US")} {shown === 1 ? "word" : "words"}
      </div>
    </div>
  );
}
