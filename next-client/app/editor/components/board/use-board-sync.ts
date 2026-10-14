"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "jotai";
import { atom_fileContent, atom_openFiles } from "@/app/atoms/file-atoms";
import { parseBoard, serializeBoard, type BoardDoc, type BoardElement, type BoardParse, type BoardScene } from "@/app/utils/board/board-format";
import { pickBoardAppState } from "@/app/utils/board/board-serialize";
import { registerBoardFlush } from "@/app/utils/board/board-flush";

export const BOARD_WRITE_DELAY = 500;

interface Pending {
  key: string;
  elements: readonly unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
}

interface Options {
  path: string;
  /** atom_fileContent(path) */
  content: string;
  /** Injected so this hook never imports Excalidraw. */
  hashElements: (elements: readonly any[]) => number | string;
  /** The tab text changed from outside: show this scene (BoardView → updateScene). */
  onExternalScene: (scene: BoardScene) => void;
}

// Connects a board canvas to the tab's text. Canvas changes are debounced and
// written as Markdown into the content atom (the normal save pipeline then
// persists them); external text changes flow back into the canvas. Flushes
// run synchronously before every save read (see board-flush.ts).
export function useBoardSync({ path, content, hashElements, onExternalScene }: Options) {
  const store = useStore();
  const [parsed, setParsed] = useState<BoardParse>(() => parseBoard(content));
  const lastWrittenRef = useRef(content);
  const docRef = useRef<BoardDoc | null>(parsed.ok ? parsed.doc : null);
  // null = waiting for Excalidraw's first onChange (the baseline), which never writes.
  const changeKeyRef = useRef<string | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hashRef = useRef(hashElements);
  const externalRef = useRef(onExternalScene);
  hashRef.current = hashElements;
  externalRef.current = onExternalScene;

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending || !docRef.current) return;
    pendingRef.current = null;
    changeKeyRef.current = pending.key;
    const files = store.get(atom_openFiles);
    // The tab is gone (closed, renamed or deleted): nothing to write into.
    if (!(path in files)) return;
    const scene: BoardScene = {
      appState: pickBoardAppState(pending.appState),
      elements: pending.elements as BoardElement[],
      files: pending.files,
    };
    const md = serializeBoard(docRef.current, scene);
    if (md === files[path].content) return;
    lastWrittenRef.current = md;
    store.set(atom_fileContent(path), md);
  }, [path, store]);

  const handleChange = useCallback(
    (elements: readonly any[], appState: Record<string, unknown>, files?: Record<string, unknown>) => {
      const key = `${hashRef.current(elements)}|${JSON.stringify(pickBoardAppState(appState))}`;
      if (changeKeyRef.current === null) {
        changeKeyRef.current = key;
        return;
      }
      if (key === changeKeyRef.current) return;
      pendingRef.current = { key, elements, appState, files: files ?? {} };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, BOARD_WRITE_DELAY);
    },
    [flush],
  );

  // External change: disk (or another tab) wins; drop any pending stroke.
  useEffect(() => {
    if (content === lastWrittenRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    lastWrittenRef.current = content;
    const next = parseBoard(content);
    setParsed(next);
    if (next.ok) {
      docRef.current = next.doc;
      changeKeyRef.current = null;
      externalRef.current(next.scene);
    } else {
      docRef.current = null;
    }
  }, [content]);

  useEffect(() => {
    const unregister = registerBoardFlush(path, flush);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      unregister();
      flush();
    };
  }, [path, flush]);

  return { parsed, handleChange, flush };
}
