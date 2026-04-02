import { useState, useEffect } from "react";

const useIsMobile = (breakpoint = 1052) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Define the media query string
    const query = `(max-width: ${breakpoint}px)`;
    const media = window.matchMedia(query);

    // Initial check
    if (media.matches !== isMobile) {
      setIsMobile(media.matches);
    }

    // Modern listener for resize changes
    const listener = (e) => setIsMobile(e.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [breakpoint, isMobile]);

  return isMobile;
};

export default useIsMobile;

