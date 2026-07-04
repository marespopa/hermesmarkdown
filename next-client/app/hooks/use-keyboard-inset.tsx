import { useEffect, useState } from "react";

// Detects the on-screen keyboard via visualViewport height shrinking relative
// to the layout viewport — there's no direct "keyboard open" API. Returns the
// pixel inset so callers can reserve space or lift fixed elements clear of it.
export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      const shrink = window.innerHeight - vv.height;
      setInset(shrink > 150 ? shrink : 0);
    };
    handleResize();
    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  return inset;
}
