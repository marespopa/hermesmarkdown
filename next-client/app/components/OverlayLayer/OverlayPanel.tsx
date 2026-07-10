"use client";

import React, { useState } from "react";
import Portal from "@/app/components/Portal/Portal";
import OverlayBackdrop from "./OverlayBackdrop";
import { useOverlayDismissal, useFocusTrap } from "./useOverlay";
import type { OverlayVariant, OverlayBackdropVariant, DismissTrigger } from "./overlay-types";

interface OverlayPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  variant: OverlayVariant;
  backdrop?: OverlayBackdropVariant;
  backdropClassName?: string;
  dismissOn?: DismissTrigger[];
  /** ms to keep mounted after isOpen flips false, for exit animation. 0 = unmount immediately. */
  exitDurationMs?: number;
  lockScroll?: boolean;
  disableFocusTrap?: boolean;
  /** Appended to the fixed/absolute positioning wrapper — e.g. alignment (items-center vs items-end). */
  containerClassName?: string;
  /** Classes for the actual panel content wrapper (background, animation, sizing). */
  panelClassName?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  role?: string;
  children: React.ReactNode;
}

// Positioning skeleton per variant — alignment/animation is supplied by
// consumers via containerClassName/panelClassName so each migrated overlay
// can keep its exact existing look. `edge-panel` and `popover` are defined
// for the sidebar and WikiLink-hover fast-follows; nothing uses them yet.
const CONTAINER_BASE: Record<OverlayVariant, string> = {
  modal: "fixed inset-0 flex",
  sheet: "fixed inset-0 flex flex-col",
  "edge-panel": "fixed inset-y-0 left-0 flex",
  popover: "absolute",
};

export default function OverlayPanel({
  isOpen,
  onClose,
  onConfirm,
  variant,
  backdrop = "dim",
  backdropClassName = "",
  dismissOn,
  exitDurationMs = 0,
  lockScroll = variant === "modal" || variant === "sheet",
  disableFocusTrap = false,
  containerClassName = "",
  panelClassName = "",
  ariaLabelledBy,
  ariaDescribedBy,
  role = "dialog",
  children,
}: OverlayPanelProps) {
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const { isMounted, onBackdropClick } = useOverlayDismissal(isOpen, onClose, {
    dismissOn,
    exitDurationMs,
    lockScroll,
    onConfirm,
  });
  useFocusTrap(panelEl, !disableFocusTrap && isOpen);

  if (!isMounted) return null;

  return (
    <Portal>
      <div
        className={`${CONTAINER_BASE[variant]} z-[1000] ${containerClassName}`}
        onClick={onBackdropClick}
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        <OverlayBackdrop variant={backdrop} className={backdropClassName} onClick={onBackdropClick} />
        <div
          ref={setPanelEl}
          onClick={(e) => e.stopPropagation()}
          className={`relative pointer-events-auto ${panelClassName}`}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
