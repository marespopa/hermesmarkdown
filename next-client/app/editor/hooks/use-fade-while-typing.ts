"use client";

import { useEffect, useState } from "react";

// Whether the chrome should step back: true from the first keystroke typed
// into a note (input inside a `.cm-editor`) until the pointer next moves, so
// the page is only text while writing and the controls return on reach.
export function useFadeWhileTyping(): boolean {
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const onBeforeInput = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(".cm-editor")) setFaded(true);
    };
    const onPointerMove = () => setFaded(false);
    document.addEventListener("beforeinput", onBeforeInput, true);
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      document.removeEventListener("beforeinput", onBeforeInput, true);
      document.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return faded;
}
