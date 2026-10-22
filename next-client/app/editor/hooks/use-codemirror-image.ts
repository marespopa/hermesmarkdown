"use client";

import { useCallback, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { findImageAtPos, ImageMatch } from "../utils/image-detection";

interface Pos {
  top: number;
  left: number;
}

interface UseCodeMirrorImageOptions {
  viewRef: React.RefObject<EditorView | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface ImageDisplay {
  info: ImageMatch;
  buttonPos: Pos;
}

function computeImageDisplay(
  view: EditorView,
  pos: number,
  containerRef: React.RefObject<HTMLDivElement | null>,
): ImageDisplay | null {
  // An image link is on one line: only the caret's line is searched.
  const line = view.state.doc.lineAt(pos);
  const match = findImageAtPos(line.text, pos - line.from);
  if (!match) return null;
  const result = { ...match, start: match.start + line.from, end: match.end + line.from };

  const wrapperRect = containerRef.current?.getBoundingClientRect();
  const coords = view.coordsAtPos(pos);
  if (!wrapperRect || !coords) return { info: result, buttonPos: { top: 0, left: 0 } };

  const scrollTop = containerRef.current?.scrollTop ?? 0;
  return {
    info: result,
    buttonPos: {
      top: coords.top - wrapperRect.top - 26 + scrollTop,
      left: coords.left - wrapperRect.left,
    },
  };
}

function sameDisplay(a: ImageDisplay | null, b: ImageDisplay | null): boolean {
  if (!a || !b) return a === b;
  return a.info.src === b.info.src && a.info.alt === b.info.alt && a.info.start === b.info.start
    && a.info.end === b.info.end && a.buttonPos.top === b.buttonPos.top && a.buttonPos.left === b.buttonPos.left;
}

export function useCodeMirrorImage({ containerRef }: UseCodeMirrorImageOptions) {
  const [display, setDisplay] = useState<ImageDisplay | null>(null);

  const detectImageAtCaret = useCallback((view: EditorView) => {
    const sel = view.state.selection.main;
    const next = sel.empty ? computeImageDisplay(view, sel.head, containerRef) : null;
    // Typing past an image keeps the same button: no React render per key.
    setDisplay((current) => (sameDisplay(current, next) ? current : next));
  }, [containerRef]);

  return {
    imageInfo: display?.info ?? null,
    buttonPos: display?.buttonPos ?? { top: 0, left: 0 },
    onCursorActivity: detectImageAtCaret,
  };
}
