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
  const [pillType, setPillType] = useState<"url" | "wiki" | null>(null);
  const [pillRange, setPillRange] = useState<{
    start: number;
    end: number;
    rawString: string;
  } | null>(null);
  const suppressRef = useRef(false);

  // Sync pillRange/pillType when pillUrl is cleared
  useEffect(() => {
    if (pillUrl === null) {
      setPillRange(null);
      setPillType(null);
    }
  }, [pillUrl]);

  // Dismiss and briefly suppress re-detection whenever the value changes (user typed)
  useEffect(() => {
    suppressRef.current = true;
    setPillUrl(null);
    const timer = setTimeout(() => {
      suppressRef.current = false;
    }, 50);
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
    if (!result) {
      setPillUrl(null);
      return;
    }

    const pillWidth = 70;
    const caretAtCursor = getCaretCoordinates(textarea, pos);
    const caretHeight = caretAtCursor.height || 22;

    setPillPos({
      top: caretAtCursor.top + caretHeight / 2 - 14 - 2,
      left: Math.min(caretAtCursor.left + 8, textarea.clientWidth - pillWidth),
    });
    setPillLabel(result.label ?? "");
    setPillRange({
      start: result.start,
      end: result.end,
      rawString: result.rawString,
    });
    setPillType(result.type as "url" | "wiki");
    setPillUrl(result.value);
  }, [value, textareaRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", detectLinkAtCaret);
    return () =>
      document.removeEventListener("selectionchange", detectLinkAtCaret);
  }, [detectLinkAtCaret]);

  return {
    pillUrl,
    pillLabel,
    pillPos,
    pillType,
    pillRange,
    setPillUrl,
    detectLinkAtCaret,
  };
}
