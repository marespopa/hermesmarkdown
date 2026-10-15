"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "jotai";
import { atom_boardViewports, type BoardViewport } from "@/app/atoms/board-atoms";

export const VIEWPORT_SAVE_DELAY = 300;

// A board's scroll and zoom, kept per path in this tab's sessionStorage and
// never in the file. `initial` is read once (not subscribed).
export function useBoardViewport(path: string) {
  const store = useStore();
  const initialRef = useRef<BoardViewport | null>(null);
  const initialPathRef = useRef<string | null>(null);
  if (initialPathRef.current !== path) {
    initialPathRef.current = path;
    initialRef.current = store.get(atom_boardViewports)[path] ?? null;
  }
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRef = useRef<BoardViewport | null>(initialRef.current);

  const report = useCallback(
    (appState: { scrollX?: number; scrollY?: number; zoom?: { value: number } }) => {
      const next: BoardViewport = {
        scrollX: appState.scrollX ?? 0,
        scrollY: appState.scrollY ?? 0,
        zoom: appState.zoom?.value ?? 1,
      };
      const last = lastRef.current;
      if (last && last.scrollX === next.scrollX && last.scrollY === next.scrollY && last.zoom === next.zoom) return;
      lastRef.current = next;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        store.set(atom_boardViewports, { ...store.get(atom_boardViewports), [path]: next });
      }, VIEWPORT_SAVE_DELAY);
    },
    [path, store],
  );

  // Unmounting (tab switch) commits a viewport still waiting on its timer.
  useEffect(
    () => () => {
      if (!timerRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = null;
      if (lastRef.current) {
        store.set(atom_boardViewports, { ...store.get(atom_boardViewports), [path]: lastRef.current });
      }
    },
    [path, store],
  );

  return { initial: initialRef.current, report };
}
