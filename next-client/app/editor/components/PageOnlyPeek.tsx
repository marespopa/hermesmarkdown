"use client";

import React, { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_pageOnly } from "@/app/atoms/ui-atoms";

// How long (ms) the top-right row stays after the top edge is touched.
export const PEEK_MS = 4000;
const PEEK_ATTRIBUTE = "data-page-only-peek";
// Marks the row that comes back, so a press inside it keeps it there.
export const PEEK_ROW_ATTRIBUTE = "data-page-only-row";

// The height (px) of the top edge that answers.
export const PEEK_EDGE = 32;

// The top-corner buttons rest invisible; the window's top edge brings them
// back. In No Distraction Mode nothing is left on screen, so a hand on the
// very top edge (a finished tap, or the mouse moving there) brings the
// top-right row back for a few seconds: the button to leave the mode, and the
// search pill that opens the palette. A press anywhere else puts it away
// again. The edge itself counts as part of the row, so tapping it again keeps
// it up.
//
// The edge is watched from the document, by where the pointer is, and the
// strip drawn here takes no pointer events: the pane's title sits in the same
// band, and a strip that caught clicks made its top part unclickable.
export default function PageOnlyPeek() {
  const [peek, setPeek] = useState(false);
  const pageOnly = useAtomValue(atom_pageOnly);

  // Leaving the mode puts the row away with it.
  useEffect(() => {
    if (!pageOnly) setPeek(false);
  }, [pageOnly]);

  // The row comes back on the finished tap or a mouse move, never on the
  // press: the tap that ends under the finger would land on whatever just
  // appeared there (the search pill, in the corner). A touch screen sends its
  // mouse move after the finger lifts, with the click.
  useEffect(() => {
    const onEdge = (event: MouseEvent) => {
      if (event.clientY < PEEK_EDGE) setPeek(true);
    };
    document.addEventListener("mousemove", onEdge);
    document.addEventListener("click", onEdge);
    return () => {
      document.removeEventListener("mousemove", onEdge);
      document.removeEventListener("click", onEdge);
    };
  }, []);

  useEffect(() => {
    if (!peek) return;
    const root = document.documentElement;
    root.setAttribute(PEEK_ATTRIBUTE, "");
    let timer = setTimeout(() => setPeek(false), PEEK_MS);
    const onPointerDown = (event: PointerEvent) => {
      const inRow = event.target instanceof Element && !!event.target.closest(`[${PEEK_ROW_ATTRIBUTE}]`);
      if (inRow || event.clientY < PEEK_EDGE) {
        clearTimeout(timer);
        timer = setTimeout(() => setPeek(false), PEEK_MS);
      } else {
        setPeek(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown, true);
      root.removeAttribute(PEEK_ATTRIBUTE);
    };
  }, [peek]);

  return (
    <div
      data-testid="page-only-peek"
      aria-hidden="true"
      style={{ height: PEEK_EDGE }}
      className="pointer-events-none fixed inset-x-0 top-0 z-20"
    />
  );
}
