"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// A home page section's entrance: a fade and a small rise, once, the first
// time it scrolls into view. The content is visible until the page has
// hydrated (so the server's HTML, crawlers and no-JS readers see everything),
// and stays still under reduced motion.
export default function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen (the first section, a reload mid-page): no entrance.
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    setHidden(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHidden(false);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={hidden ? "waiting" : "shown"}
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
        hidden ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
      } ${className}`}
    >
      {children}
    </div>
  );
}
