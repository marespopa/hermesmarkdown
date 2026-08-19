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
  const result = findImageAtPos(view.state.doc.toString(), pos);
  if (!result) return null;

  const wrapperRect = containerRef.current?.getBoundingClientRect();
  const coords = view.coordsAtPos(result.start);
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

export function useCodeMirrorImage({ containerRef }: UseCodeMirrorImageOptions) {
  const [display, setDisplay] = useState<ImageDisplay | null>(null);

  const detectImageAtCaret = useCallback((view: EditorView) => {
    const sel = view.state.selection.main;
    setDisplay(sel.empty ? computeImageDisplay(view, sel.head, containerRef) : null);
  }, [containerRef]);

  return {
    imageInfo: display?.info ?? null,
    buttonPos: display?.buttonPos ?? { top: 0, left: 0 },
    onCursorActivity: detectImageAtCaret,
  };
}
