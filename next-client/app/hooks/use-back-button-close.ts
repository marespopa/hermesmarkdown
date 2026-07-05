"use client";

import { useEffect, useRef } from "react";

// Traps the device/browser back action (Android hardware back, edge-swipe,
// or the browser's back button) so it closes the open overlay instead of
// navigating away from the editor. While open, we push a dummy history
// entry; popping it (via back) calls onClose instead of leaving the page.
//
// We deliberately never call history.back()/replaceState ourselves to clean
// up after a non-back close (e.g. an explicit X button, or a menu item that
// both closes the overlay and routes elsewhere via next/navigation). Doing
// so raced with Next's router — calling history.back() right as router.push
// was committing a new entry desynced Next's internal history bookkeeping
// from the real browser stack, and it silently dropped the navigation
// (confirmed: the route's data fetched fine, but the URL never changed).
// The cost of not popping is one harmless extra history entry left behind
// per non-back close, which just takes one extra back-press to skip past.
export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    history.pushState({ hermesOverlay: true }, "");

    const handlePopState = () => {
      onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen]);
}
