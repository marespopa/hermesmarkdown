"use client";

import { useEffect, RefObject } from "react";

// Suppress the virtual keyboard when a physical (Bluetooth) keyboard is active.
// Strategy: if a keydown arrives more than 500ms after the last touchstart, we
// infer a hardware keyboard and set inputMode="none" on the textarea so the OS
// skips the IME on the next focus. Reverting to inputMode="text" on touchstart
// restores normal behaviour when the user switches back to finger input.
export function useHardwareKeyboard(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) {
  useEffect(() => {
    let lastTouchTime = 0;
    let isHardware = false;

    const apply = () => {
      const el = textareaRef.current;
      if (el) el.inputMode = isHardware ? "none" : "text";
    };

    const onTouchStart = () => {
      lastTouchTime = Date.now();
      if (isHardware) { isHardware = false; apply(); }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (["Meta", "Control", "Alt", "Shift"].includes(e.key)) return;
      if (!isHardware && Date.now() - lastTouchTime > 500) {
        isHardware = true;
        apply();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [textareaRef]);
}
