import { useState, useEffect } from "react";

// Dedicated 768px breakpoint for the iA-Writer-style chrome system (hover
// sidebar, bottom nav, full-screen overlays). Distinct from `useIsMobile`
// (1052px), which existing layout code already keys off of.
const useIsMobileChrome = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = `(max-width: ${breakpoint}px)`;
    const media = window.matchMedia(query);

    if (media.matches !== isMobile) {
      setIsMobile(media.matches);
    }

    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [breakpoint, isMobile]);

  return isMobile;
};

export default useIsMobileChrome;
