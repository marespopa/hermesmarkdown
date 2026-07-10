"use client";

import type { OverlayBackdropVariant } from "./overlay-types";

interface OverlayBackdropProps {
  variant: OverlayBackdropVariant;
  onClick?: (e: React.MouseEvent) => void;
  /** Transition/animation classes, kept caller-controlled since consumers differ (animate-in-on-mount vs opacity-toggle-while-mounted). */
  className?: string;
}

// Canonical dim treatment (was DialogModal's inline classes and, separately,
// CommandPalette's `bg-fg/30` — unified here per the OverlayLayer plan).
const DIM_BASE = "bg-black/40 dark:bg-black/60 backdrop-blur-md";

export default function OverlayBackdrop({ variant, onClick, className = "" }: OverlayBackdropProps) {
  if (variant === "none") return null;
  const base = variant === "dim" ? DIM_BASE : "";
  return <div className={`absolute inset-0 ${base} ${className}`} onClick={onClick} />;
}
