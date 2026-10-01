"use client";

import React from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import Button from "@/app/components/Button";

type TabStripScrollerProps = React.HTMLAttributes<HTMLDivElement>;

const ARROW_BUTTON_CLASS =
  "w-6 h-8 flex items-center justify-center text-ink-muted hover:text-ink-light dark:hover:text-ink-dark transition-all rounded-lg disabled:opacity-30 disabled:pointer-events-none";

// Horizontally scrolling tab strip. When the tabs overflow, a pair of
// arrows appears at the strip's end so it can be scrolled without a
// trackpad or shift+wheel.
export default function TabStripScroller({ children, className = "", ...rest }: TabStripScrollerProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = React.useState({ overflows: false, canLeft: false, canRight: false });

  const measure = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const next = {
      overflows: maxScroll > 1,
      canLeft: el.scrollLeft > 1,
      canRight: el.scrollLeft < maxScroll - 1,
    };
    setScrollState((prev) =>
      prev.overflows === next.overflows && prev.canLeft === next.canLeft && prev.canRight === next.canRight ? prev : next,
    );
  }, []);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  // Tabs opening/closing change scrollWidth without resizing the strip.
  React.useLayoutEffect(measure);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = direction * Math.max(el.clientWidth * 0.7, 120);
    if (typeof el.scrollBy === "function") el.scrollBy({ left, behavior: "smooth" });
    else el.scrollLeft += left;
  };

  return (
    <div className="flex items-center flex-1 h-full min-w-0">
      <div ref={scrollerRef} className={className} {...rest}>
        {children}
      </div>
      {scrollState.overflows && (
        <div className="flex items-center shrink-0 pl-0.5">
          <Button
            variant="icon"
            onClick={() => scrollByPage(-1)}
            disabled={!scrollState.canLeft}
            aria-label="Scroll tabs left"
            className={ARROW_BUTTON_CLASS}
          >
            <HiOutlineChevronLeft size={15} />
          </Button>
          <Button
            variant="icon"
            onClick={() => scrollByPage(1)}
            disabled={!scrollState.canRight}
            aria-label="Scroll tabs right"
            className={ARROW_BUTTON_CLASS}
          >
            <HiOutlineChevronRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
