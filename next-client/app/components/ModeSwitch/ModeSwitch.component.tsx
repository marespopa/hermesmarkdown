"use client";

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import Button from "@/app/components/Button";

export interface ModeSwitchOption<T extends string> {
  value: T;
  label: string;
  Icon?: IconType;
}

interface ModeSwitchProps<T extends string> {
  options: readonly ModeSwitchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the whole group. */
  label: string;
  size?: "sm" | "md";
  /** Hide the text labels (they stay available to screen readers). */
  iconOnly?: boolean;
  className?: string;
}

const SIZES = {
  sm: { track: "h-7", segment: "h-6 px-2.5 gap-1.5", iconOnly: "h-6 w-7", icon: 13 },
  md: { track: "h-8", segment: "h-7 px-3 gap-1.5", iconOnly: "h-7 w-8", icon: 14 },
} as const;

// iOS-style spring-like ease-out for the sliding thumb. Arbitrary property, not
// an arbitrary-value ease utility: tailwindcss-animate also defines the ease
// utilities, so that class would be ambiguous. (Tailwind scans comments too,
// so don't spell the class out here.)
const THUMB_EASE = "[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]";

// Segmented control with a sliding thumb: a pill track whose highlighted
// "thumb" glides under the selected option. The thumb is measured from the
// active segment, so options may have different label widths.
export default function ModeSwitch<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "sm",
  iconOnly = false,
  className = "",
}: ModeSwitchProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef(new Map<T, HTMLButtonElement>());
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  // No slide on first paint: the thumb appears in place, then animates.
  const [animated, setAnimated] = useState(false);
  const dims = SIZES[size];

  const measure = useCallback(() => {
    const el = segmentRefs.current.get(value);
    if (!el) return;
    setThumb((prev) =>
      prev && prev.left === el.offsetLeft && prev.width === el.offsetWidth
        ? prev
        : { left: el.offsetLeft, width: el.offsetWidth },
    );
  }, [value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, iconOnly, size, options]);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return () => cancelAnimationFrame(id);
    const observer = new ResizeObserver(() => measure());
    observer.observe(track);
    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [measure]);

  const select = (next: T) => {
    if (next !== value) onChange(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1
      : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    select(next.value);
    segmentRefs.current.get(next.value)?.focus();
  };

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={label}
      className={`relative inline-flex items-center shrink-0 rounded-full bg-surface-raised border border-edge-subtle p-0.5 ${dims.track} ${className}`}
    >
      {thumb && (
        <span
          aria-hidden="true"
          className={`absolute top-0.5 bottom-0.5 left-0 rounded-full bg-surface shadow-sm ring-1 ring-black/5 ${
            animated ? `transition-[transform,width] duration-300 ${THUMB_EASE} motion-reduce:transition-none` : ""
          }`}
          style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
          data-testid="mode-switch-thumb"
        />
      )}
      {options.map((option, index) => {
        const checked = option.value === value;
        const Icon = option.Icon;
        return (
          <Button
            key={option.value}
            variant="unstyled"
            ref={(el: HTMLButtonElement | null) => {
              if (el) segmentRefs.current.set(option.value, el);
              else segmentRefs.current.delete(option.value);
            }}
            role="radio"
            aria-checked={checked}
            aria-label={iconOnly ? option.label : undefined}
            tabIndex={checked ? 0 : -1}
            onClick={(event) => {
              event.stopPropagation();
              select(option.value);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`relative z-10 inline-flex items-center justify-center rounded-full text-ui-footnote font-medium transition-colors duration-200 focus-visible:!ring-sage/20 focus-visible:!ring-offset-0 ${
              iconOnly ? dims.iconOnly : dims.segment
            } ${checked ? "text-fg" : "text-fg-muted hover:text-fg"}`}
          >
            {Icon && <Icon size={dims.icon} aria-hidden="true" />}
            {!iconOnly && <span>{option.label}</span>}
          </Button>
        );
      })}
    </div>
  );
}
