"use client";

import { useCallback, useState } from "react";
import type { EditorView } from "@codemirror/view";

interface Pos {
  top: number;
  left: number;
}

interface MermaidInfo {
  source: string;
  lineStart: number;
  lineEnd: number;
}

interface UseCodeMirrorMermaidOptions {
  viewRef: React.RefObject<EditorView | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function findMermaidAtPos(doc: string, pos: number): MermaidInfo | null {
  const lines = doc.split("\n");
  let charCount = 0;
  let currentLine = 0;

  // Find which line the cursor is on
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline
    if (charCount + lineLength > pos) {
      currentLine = i;
      break;
    }
    charCount += lineLength;
  }

  // Check if we're in or near a mermaid block
  let startLine = -1;
  let endLine = -1;

  // Search upward for opening fence
  for (let i = currentLine; i >= 0; i--) {
    if (lines[i].trimStart().startsWith("```mermaid")) {
      startLine = i;
      break;
    }
    if (lines[i].trim() === "```" || (i < currentLine && lines[i].trimStart().startsWith("```"))) {
      return null; // Hit a different code block
    }
  }

  if (startLine === -1) return null;

  // Search downward for closing fence
  for (let i = startLine + 1; i < lines.length; i++) {
    if (lines[i].trim() === "```") {
      endLine = i;
      break;
    }
  }

  if (endLine === -1) return null;

  // Extract source
  const sourceLines = lines.slice(startLine + 1, endLine);
  const source = sourceLines.join("\n");

  return { source, lineStart: startLine, lineEnd: endLine };
}

export function useCodeMirrorMermaid({ viewRef, containerRef }: UseCodeMirrorMermaidOptions) {
  const [mermaidInfo, setMermaidInfo] = useState<MermaidInfo | null>(null);
  const [buttonPos, setButtonPos] = useState<Pos>({ top: 0, left: 0 });

  const detectMermaidAtCaret = useCallback((view: EditorView) => {
    const sel = view.state.selection.main;
    const pos = sel.head;
    const result = sel.empty ? findMermaidAtPos(view.state.doc.toString(), pos) : null;

    if (!result) {
      setMermaidInfo(null);
      return;
    }

    const wrapperRect = containerRef.current?.getBoundingClientRect();
    
    // Get position of the start of the opening fence line
    let charCount = 0;
    const lines = view.state.doc.toString().split("\n");
    for (let i = 0; i < result.lineStart; i++) {
      charCount += lines[i].length + 1;
    }

    const caretCoords = view.coordsAtPos(charCount);
    if (wrapperRect && caretCoords) {
      const caretTop = caretCoords.top - wrapperRect.top;
      const caretLeft = caretCoords.left - wrapperRect.left;
      const scrollTop = containerRef.current?.scrollTop ?? 0;
      
      setButtonPos({
        top: caretTop + scrollTop,
        left: caretLeft + 100, // Position to the right of the fence
      });
    }

    setMermaidInfo(result);
  }, [containerRef]);

  return {
    mermaidInfo,
    buttonPos,
    onCursorActivity: detectMermaidAtCaret,
  };
}
