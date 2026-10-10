"use client";

import { useEffect } from "react";

// Hide the interface while typing: text typed into an editor fades the
// window chrome (elements with `.typing-chrome`: the pane header, the
// sidebar, the mobile file bar) so only the sheet is left. It comes back when
// the mouse moves over where the chrome sits (moving over the text leaves it
// hidden), or on a tap or focus outside the editor.
// The state lives on <html data-chrome-faded> rather than in an atom, so a
// keystroke never re-renders React; the fade itself is CSS (editor.scss).
// Fading never changes layout, so the text doesn't move.

export const CHROME_FADED_ATTRIBUTE = "data-chrome-faded";
// How far the mouse travels (px) before the chrome returns: enough to
// ignore a nudged desk or a trackpad's resting jitter.
export const REVEAL_DISTANCE = 8;

const inEditor = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest(".cm-editor");

// Faded chrome has `pointer-events: none`, so it never gets hover events;
// the pointer is tested against each element's box instead.
const overChrome = (x: number, y: number) =>
  Array.from(document.querySelectorAll(".typing-chrome")).some((element) => {
    const box = element.getBoundingClientRect();
    return x >= box.left && x < box.right && y >= box.top && y < box.bottom;
  });

export function useFadeChromeWhileTyping(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    let faded = false;
    let travelled = 0;

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
      travelled += Math.abs(event.movementX) + Math.abs(event.movementY);
      if (travelled >= REVEAL_DISTANCE && overChrome(event.clientX, event.clientY)) reveal();
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
