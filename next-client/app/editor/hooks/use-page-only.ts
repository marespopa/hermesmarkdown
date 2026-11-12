import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { atom_pageOnly } from "@/app/atoms/ui-atoms";
import { formatShortcut } from "@/app/utils/platform";

// The attribute the `.page-only-hide` and `.page-only-room` rules
// (globals.scss) read.
const ATTRIBUTE = "data-page-only";

// Ctrl/Cmd+Alt+Z, by `code` (Alt changes `key` on macOS).
export function isPageOnlyShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && event.code === "KeyZ" && !event.defaultPrevented;
}

// No Distraction Mode: marks <html> while it is on (one attribute, so turning
// it on re-renders nothing), answers Ctrl/Cmd+Alt+Z, and says once, quietly,
// how to get back, since nothing is left on screen to click (the shortcut, or
// the top edge, PageOnlyPeek). `enabled` is
// false where there is nothing to hide (Settings); the mode itself is kept.
export function usePageOnly(enabled: boolean) {
  const [pageOnly, setPageOnly] = useAtom(atom_pageOnly);

  useEffect(() => {
    if (!enabled || !pageOnly) return;
    document.documentElement.setAttribute(ATTRIBUTE, "");
    return () => document.documentElement.removeAttribute(ATTRIBUTE);
  }, [enabled, pageOnly]);

  const wasOn = useRef(pageOnly);
  useEffect(() => {
    if (pageOnly && !wasOn.current && enabled) {
      // No keyboard on a touch screen: the top edge is the way back.
      const touch = window.matchMedia?.("(hover: none)").matches;
      const how = touch ? "tap the top edge to leave" : `${formatShortcut("Z", { alt: true })} or the top edge to leave`;
      toast(`No Distraction Mode · ${how}`, { id: "page-only", duration: 3000 });
    }
    wasOn.current = pageOnly;
  }, [pageOnly, enabled]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPageOnlyShortcut(event)) return;
      event.preventDefault();
      setPageOnly((on) => !on);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPageOnly]);
}
