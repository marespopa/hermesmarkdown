"use client";

import { useEffect, useState, type RefObject } from "react";
import Button from "@/app/components/Button/Button.component";

interface FloatingStartButtonProps {
  /** The hero's call to action: the floating one shows once it has scrolled out of view above. */
  heroRef: RefObject<HTMLElement | null>;
  onStart: () => void;
}

// "Start writing" that follows you down the home page: the button alone, centered
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
      {/* The button alone, no tray around it: a soft, wide shadow lifts it off the page. */}
      <Button
        variant="hero"
        onClick={onStart}
        className="pointer-events-auto !h-11 !px-8 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_12px_32px_-8px_rgb(0_0_0/0.35)]"
      >
        Start writing
      </Button>
    </div>
  );
}
