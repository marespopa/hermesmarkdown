"use client";

import React, { useEffect, useState } from "react";

// How long (ms) the top-right row stays after the top edge is touched.
export const PEEK_MS = 4000;
const PEEK_ATTRIBUTE = "data-page-only-peek";
// Marks the row that comes back, so a press inside it keeps it there.
export const PEEK_ROW_ATTRIBUTE = "data-page-only-row";

// The top-corner buttons rest invisible; this strip brings them back. In No
// Distraction Mode nothing is left on screen, so a hand on the very top edge (a tap, or the pointer resting there)
// brings the top-right row back for a few seconds: the button to leave the
// mode, and the search pill that opens the palette. A press anywhere else
// puts it away again. A thin strip in the page's top margin, clear of the text.
// The strip itself counts as part of the row, so tapping it again keeps it up.
export default function PageOnlyPeek() {
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    if (!peek) return;
    const root = document.documentElement;
    root.setAttribute(PEEK_ATTRIBUTE, "");
    let timer = setTimeout(() => setPeek(false), PEEK_MS);
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(`[${PEEK_ROW_ATTRIBUTE}]`)) {
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
      {...{ [PEEK_ROW_ATTRIBUTE]: "" }}
      className="fixed inset-x-0 top-0 z-20 h-8"
      // A mouse resting on the edge brings the row back; a finger doesn't count
      // as resting there. And the row comes back on the finished tap, never on
      // the press: the tap that ends under the finger would land on whatever
      // just appeared there (the search pill, in the corner).
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setPeek(true); }}
      onClick={() => setPeek(true)}
    />
  );
}
