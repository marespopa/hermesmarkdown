"use client";

import { useEffect } from "react";

// Hide the interface while typing: text typed into an editor fades the
// window chrome (elements with `.typing-chrome`: the pane header, the
// sidebar, the mobile file bar) so only the sheet is left, and the editor
// takes back the room they held (editor.scss). It comes back on a deliberate
// move of the mouse anywhere, at once when the pointer reaches the window's
// top or left edge (where the tab bar and sidebar sit), or on a tap or focus
// outside the editor.
// The state lives on <html data-chrome-faded> rather than in an atom, so a
// keystroke never re-renders React; the fade and the reclaimed room are CSS
// (editor.scss), eased so the text slides rather than jumps.

export const CHROME_FADED_ATTRIBUTE = "data-chrome-faded";
// How far the mouse travels (px) in one movement before the chrome returns:
// enough to ignore a nudged desk or a trackpad's resting jitter.
export const REVEAL_DISTANCE = 40;
// A pause this long (ms) between moves starts the travel count over, so
// jitter spread across minutes of typing never adds up to a reveal.
export const REVEAL_PAUSE = 300;
// Within this many px of the top or left edge, any movement brings the
// chrome back.
export const EDGE_REVEAL_ZONE = 12;

const inEditor = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest(".cm-editor");

const atLeadingEdge = (x: number, y: number) => x < EDGE_REVEAL_ZONE || y < EDGE_REVEAL_ZONE;

export function useFadeChromeWhileTyping(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    let faded = false;
    let travelled = 0;
    let lastMoveAt = -Infinity;

    const fade = () => {
      if (faded) return;
      faded = true;
      travelled = 0;
      root.setAttribute(CHROME_FADED_ATTRIBUTE, "");
    };
    const reveal = () => {
      if (!faded) return;
      faded = false;
      root.removeAttribute(CHROME_FADED_ATTRIBUTE);
    };

    // `beforeinput`, not `keydown`: it fires for every way text goes in —
    // keys, IME composition, a phone's keyboard — and never for shortcuts.
    const onBeforeInput = (event: Event) => {
      if (inEditor(event.target)) fade();
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!faded) return;
      if (event.timeStamp - lastMoveAt > REVEAL_PAUSE) travelled = 0;
      lastMoveAt = event.timeStamp;
      travelled += Math.abs(event.movementX) + Math.abs(event.movementY);
      if (travelled >= REVEAL_DISTANCE || atLeadingEdge(event.clientX, event.clientY)) reveal();
    };
    // Touch has no hover: a tap anywhere but the text brings it back.
    const onPointerDown = (event: PointerEvent) => {
      if (!inEditor(event.target)) reveal();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!inEditor(event.target)) reveal();
    };

    document.addEventListener("beforeinput", onBeforeInput, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      document.removeEventListener("beforeinput", onBeforeInput, true);
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      root.removeAttribute(CHROME_FADED_ATTRIBUTE);
    };
  }, [enabled]);
}
