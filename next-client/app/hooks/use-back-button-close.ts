"use client";

import { useEffect, useRef } from "react";

// Traps the device/browser back action (Android hardware back, edge-swipe,
// or the browser's back button) so it closes the open overlay instead of
// navigating away from the editor. While open, we push a dummy history
// entry; popping it (via back) calls onClose instead of leaving the page.
// If the overlay closes some other way (e.g. an explicit X button), we pop
// that dummy entry ourselves so history doesn't accumulate no-op steps.
export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // `history.back()` below is async — its popstate can arrive after this
  // effect has already re-run (e.g. React Strict Mode's dev-only
  // mount->cleanup->mount), so a fresh listener would otherwise catch our
  // own programmatic back-navigation and mistake it for a user back-press.
  const skipNextPopRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    history.pushState({ hermesOverlay: true }, "");
    pushedRef.current = true;

    const handlePopState = () => {
      pushedRef.current = false;
      if (skipNextPopRef.current) {
        skipNextPopRef.current = false;
        return;
      }
      onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        skipNextPopRef.current = true;
        history.back();
      }
    };
  }, [isOpen]);
}
