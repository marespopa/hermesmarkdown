"use client";

import React from "react";
import { IoClose } from "react-icons/io5";
import Button from "../Button";
import OverlayPanel from "../OverlayLayer/OverlayPanel";

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
  return (
    <OverlayPanel
      isOpen={isOpened}
      onClose={onClose}
      onConfirm={onConfirm}
      variant="modal"
      backdrop="dim"
      backdropClassName="animate-in fade-in duration-300"
      ariaLabelledBy={ariaLabelledBy}
      ariaDescribedBy={ariaDescribedBy}
      containerClassName={`p-4 sm:p-6 ${mobileSheet ? "items-end sm:items-center justify-center" : "items-center justify-center"}`}
      panelClassName={`
        z-10 w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]
        max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]
        bg-white dark:bg-neutral-900 backdrop-blur-2xl
        border border-white/20 dark:border-neutral-800/50
        overflow-hidden flex flex-col
        animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-500 ease-out
        ${mobileSheet
          ? "max-w-none sm:max-w-2xl my-0 rounded-t-[28px] rounded-b-none sm:rounded-[28px] sm:my-auto"
          : "max-w-[calc(100vw-2rem)] sm:max-w-2xl my-auto rounded-[28px]"
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
    </OverlayPanel>
  );
};

export default DialogModal;
