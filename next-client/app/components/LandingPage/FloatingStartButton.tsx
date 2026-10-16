"use client";

import { useEffect, useState, type RefObject } from "react";
import Button from "@/app/components/Button/Button.component";

interface FloatingStartButtonProps {
  /** The hero's call to action: the floating one shows once it has scrolled out of view above. */
  heroRef: RefObject<HTMLElement | null>;
  onStart: () => void;
}

// "Start Writing" that follows you down the home page: a glass pill centered
// at the bottom, sliding in once the hero's button has scrolled away above
// and out again on the way back up, so there's always one call to action in
// reach and never two. Hidden, it's inert and out of the tab order.
export default function FloatingStartButton({ heroRef, onStart }: FloatingStartButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const hero = heroRef.current;
      setIsVisible(!!hero && hero.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [heroRef]);

  return (
    <div
      inert={!isVisible}
      aria-hidden={!isVisible}
      data-visible={isVisible || undefined}
      className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
    >
      <div className="glass-panel pointer-events-auto flex items-center gap-4 rounded-full border border-edge-subtle p-1.5 shadow-lg sm:pl-5">
        <p className="hidden text-ui-footnote text-fg-muted sm:block">No account. Your notes stay on your device.</p>
        <Button variant="hero" onClick={onStart} className="!h-10 !rounded-full !px-6">
          Start Writing
        </Button>
      </div>
    </div>
  );
}
