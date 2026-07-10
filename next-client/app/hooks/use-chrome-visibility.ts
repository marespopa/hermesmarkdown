"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_isEditorFocused } from "@/app/atoms/atoms";

interface UseChromeVisibilityOptions {
  /** How long the editor must stay focused and idle before this chrome fades. */
  idleMs?: number;
  /** Keep visible regardless of idle state — e.g. a panel/dialog this chrome owns is open. */
  forceVisible?: boolean;
}

// Shared idle/reveal state for chrome surfaces that should be hidden while
// the user is actively writing and reappear on demand — the desktop icon
// rail, the pane tab bar, and the mobile control rail all consume this.
// Each surface supplies its own reveal trigger (edge-hover, top-hover,
// scroll-up/tap) by calling the returned `reveal()` function; this hook
// only owns the idle timeout and the "don't hide while genuinely in use"
// rule (forceVisible, and staying visible whenever focus isn't in the
// editor at all — e.g. the user just clicked into this chrome itself).
export function useChromeVisibility({ idleMs = 2500, forceVisible = false }: UseChromeVisibilityOptions = {}) {
  const [visible, setVisible] = useState(true);
  const isEditorFocused = useAtomValue(atom_isEditorFocused);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reveal = useCallback(() => {
    setVisible(true);
    clearTimer();
    if (isEditorFocused && !forceVisible) {
      timerRef.current = setTimeout(() => setVisible(false), idleMs);
    }
  }, [isEditorFocused, forceVisible, idleMs, clearTimer]);

  useEffect(() => {
    if (forceVisible || !isEditorFocused) {
      setVisible(true);
      clearTimer();
      return clearTimer;
    }
    reveal();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorFocused, forceVisible]);

  return { visible, reveal };
}
