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

  useEffect(() => {
    if (!isOpen) return;

    history.pushState({ hermesOverlay: true }, "");
    pushedRef.current = true;

    const handlePopState = () => {
      pushedRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        history.back();
      }
    };
  }, [isOpen]);
}
