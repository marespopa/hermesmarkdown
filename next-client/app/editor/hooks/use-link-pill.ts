"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import getCaretCoordinates from "textarea-caret";
import { findLinkAtPos } from "../utils/link-detection";

interface UseLinkPillProps {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useLinkPill({ value, textareaRef }: UseLinkPillProps) {
  const [pillUrl, setPillUrl] = useState<string | null>(null);
  const [pillLabel, setPillLabel] = useState<string>("");
  const [pillPos, setPillPos] = useState({ top: 0, left: 0 });
  const [pillRange, setPillRange] = useState<{ start: number; end: number } | null>(null);
  const suppressRef = useRef(false);

  // Dismiss and briefly suppress re-detection whenever the value changes (user typed)
  useEffect(() => {
    suppressRef.current = true;
    setPillUrl(null);
    const timer = setTimeout(() => { suppressRef.current = false; }, 50);
    return () => clearTimeout(timer);
  }, [value]);

  const detectLinkAtCaret = useCallback(() => {
    if (suppressRef.current) return;

    const textarea = textareaRef.current;
    // If textarea isn't active, skip detection without dismissing —
    // the pill/sheet may have taken focus legitimately (e.g. edit dialog on mobile).
    if (!textarea || document.activeElement !== textarea) return;

    const pos = textarea.selectionStart;
    // Only show for a collapsed cursor, not a text selection
    if (textarea.selectionEnd !== pos) {
      setPillUrl(null);
      return;
    }

    const result = findLinkAtPos(value, pos);
    if (!result || result.type !== "url") {
      setPillUrl(null);
      return;
    }

    const pillHeight = 32;
    const pillWidth = 220;
    const caret = getCaretCoordinates(textarea, result.start);
    const spaceBelow = textarea.clientHeight - (caret.top - textarea.scrollTop);
    const shouldShowUp = spaceBelow < pillHeight + 8 && caret.top > pillHeight + 8;

    setPillPos({
      top: shouldShowUp
        ? caret.top - pillHeight - 6
        : caret.top + (caret.height ?? 22) + 4,
      left: Math.min(Math.max(0, caret.left), textarea.clientWidth - pillWidth),
    });
    setPillLabel(result.label ?? "");
    setPillRange({ start: result.start, end: result.end });
    setPillUrl(result.value);
  }, [value, textareaRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", detectLinkAtCaret);
    return () => document.removeEventListener("selectionchange", detectLinkAtCaret);
  }, [detectLinkAtCaret]);

  return { pillUrl, pillLabel, pillPos, pillRange, setPillUrl, detectLinkAtCaret };
}
