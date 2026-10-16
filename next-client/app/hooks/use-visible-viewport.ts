import { useEffect, useState, type CSSProperties } from "react";

// Where the on-screen keyboard overlays the page instead of resizing it (iOS
// Safari), a `fixed inset-0` layer keeps its full height under the keyboard
// and the browser pans the page to reveal the caret, sliding the top bar off
// screen. While the keyboard is open, this returns a style that pins the
// layer to the visible area instead (top at the pan offset, height to the
// keyboard's top edge); otherwise undefined, leaving the layer's own classes.
export default function useVisibleViewport(): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const keyboardOpen = window.innerHeight - vv.height > 150;
      setStyle(keyboardOpen ? { top: vv.offsetTop, bottom: "auto", height: vv.height } : undefined);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return style;
}
