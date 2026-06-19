"use client";

import React, { useEffect } from "react";
import { IoClose } from "react-icons/io5";
import Portal from "../Portal";
import Button from "../Button";

type Props = {
  isOpened: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  children: React.ReactNode;
  styles?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  hideCloseButton?: boolean;
  /** On mobile, anchors to the bottom of the screen (sheet) so the soft keyboard doesn't overlap the modal. */
  mobileSheet?: boolean;
};

const DialogModal = ({
  isOpened,
  onClose,
  onConfirm,
  children,
  styles = "",
  ariaLabelledBy,
  ariaDescribedBy,
  hideCloseButton = false,
  mobileSheet = false,
}: Props) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Enter" && onConfirm) {
        const activeElement = document.activeElement;
        // Don't trigger onConfirm if focusing on a textarea or a button (browser handles button Enter)
        if (
          activeElement?.tagName === "TEXTAREA" ||
          activeElement?.tagName === "BUTTON"
        )
          return;

        onConfirm();
      }
    };

    if (isOpened) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpened, onClose, onConfirm]);

  if (!isOpened) return null;

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-[1000] flex p-4 sm:p-6 ${
          mobileSheet
            ? "items-end sm:items-center justify-center"
            : "items-center justify-center"
        }`}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" />

        {/* Modal Container */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`
            relative z-10 w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]
            bg-white dark:bg-neutral-900 backdrop-blur-2xl
            border border-white/20 dark:border-neutral-800/50
            shadow-[0_20px_50px_rgba(0,0,0,0.1)]
            overflow-hidden flex flex-col
            pointer-events-auto
            animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-500 ease-out
            ${mobileSheet
              ? "max-w-none sm:max-w-sm my-0 rounded-t-[28px] rounded-b-none sm:rounded-[28px] sm:my-auto"
              : "max-w-sm my-auto rounded-[28px]"
            }
            ${styles}
          `}
        >
          {/* Close Button */}
          {!hideCloseButton && (
            <Button
              variant="icon"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-1.5 rounded-full
                        bg-neutral-200/50 dark:bg-neutral-800/50
                        hover:bg-neutral-300/80 dark:hover:bg-neutral-700/80
                        transition-all active:scale-90"
              aria-label="Close modal"
            >
              <IoClose
                size={20}
                className="text-neutral-600 dark:text-neutral-300"
              />
            </Button>
          )}

          <div className="p-6 sm:p-8 text-neutral-900 dark:text-neutral-100 flex flex-col min-h-0 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DialogModal;
