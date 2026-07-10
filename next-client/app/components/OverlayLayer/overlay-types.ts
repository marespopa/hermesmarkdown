export type OverlayVariant = "modal" | "sheet" | "edge-panel" | "popover";

export type OverlayBackdropVariant = "dim" | "transparent" | "none";

export type DismissTrigger = "escape" | "click-outside" | "mouse-leave";

export interface OverlayDismissalOptions {
  dismissOn?: DismissTrigger[];
  /** ms to keep the overlay mounted after isOpen flips false, so an exit animation can play. 0 = unmount immediately. */
  exitDurationMs?: number;
  lockScroll?: boolean;
  onConfirm?: () => void;
}
