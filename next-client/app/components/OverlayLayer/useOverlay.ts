"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBackButtonClose } from "@/app/hooks/use-back-button-close";
import type { DismissTrigger, OverlayDismissalOptions } from "./overlay-types";

const DEFAULT_DISMISS_ON: DismissTrigger[] = ["escape", "click-outside"];

// Shared dismissal mechanics extracted from DialogModal (Escape/Enter,
// scroll lock, back-button trap, click-outside) plus CommandPalette's
// delayed-unmount pattern generalized via `exitDurationMs`, so every
// overlay variant gets identical behavior without reimplementing it.
export function useOverlayDismissal(
  isOpen: boolean,
  onClose: () => void,
  { dismissOn = DEFAULT_DISMISS_ON, exitDurationMs = 0, lockScroll = true, onConfirm }: OverlayDismissalOptions = {},
) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const dismissOnRef = useRef(dismissOn);
  dismissOnRef.current = dismissOn;

  useBackButtonClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      return;
    }
    if (exitDurationMs <= 0) {
      setIsMounted(false);
      return;
    }
    const t = setTimeout(() => setIsMounted(false), exitDurationMs);
    return () => clearTimeout(t);
  }, [isOpen, exitDurationMs]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissOnRef.current.includes("escape")) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Enter" && onConfirm) {
        const activeElement = document.activeElement;
        // Don't trigger onConfirm if focusing a textarea or button (browser handles button Enter)
        if (activeElement?.tagName === "TEXTAREA" || activeElement?.tagName === "BUTTON") return;
        onConfirm();
      }
    };

    if (lockScroll) document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (lockScroll) document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, onConfirm, lockScroll]);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget) return;
      if (dismissOnRef.current.includes("click-outside")) onClose();
    },
    [onClose],
  );

  return { isMounted, onBackdropClick };
}

// Traps Tab/Shift+Tab within the panel while open and restores focus to
// whatever was focused before opening. DialogModal never had this; every
// OverlayPanel consumer gets it for free. Takes the panel element directly
// (not a ref object) — Portal mounts its children one render after
// OverlayPanel's own commit, so a ref-object dependency would run this
// effect before the DOM node exists and never re-fire once it appears.
// Passing the element itself as state means the effect re-runs the moment
// it's actually available.
export function useFocusTrap(panel: HTMLElement | null, isOpen: boolean) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !panel) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

    const raf = requestAnimationFrame(() => getFocusable()[0]?.focus());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = getFocusable();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      panel.removeEventListener("keydown", handleKeyDown);
      // Only restore focus if it's still inside the panel — a confirm/select
      // action (e.g. DatePickerCallout's onSelectDate) may have already
      // moved focus somewhere deliberate (like back into the editor) before
      // this cleanup runs. Blindly restoring here would steal focus back
      // and, for CodeMirror, drop the `cm-focused` class that its drawn
      // cursor layer depends on — making the caret vanish entirely.
      if (panel.contains(document.activeElement)) {
        previouslyFocused.current?.focus?.();
      }
    };
  }, [isOpen, panel]);
}
