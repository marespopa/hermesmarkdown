"use client";

import React from "react";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import { useSetAtom } from "jotai";
import { atom_pendingScrollTarget } from "@/app/atoms/atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import VaultSidebarTasks from "./VaultSidebarTasks";
import { HiOutlineX } from "react-icons/hi";

// Desktop-only expanded view of the Tasks rail panel — same list/filters,
// just a bigger centered surface for scanning more tasks at once.
export default function DesktopTasksOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { openFile } = useFileSystem();
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);

  return (
    <OverlayPanel
      isOpen={isOpen}
      onClose={onClose}
      variant="modal"
      backdrop="dim"
      backdropClassName="animate-in fade-in duration-300"
      containerClassName="p-6 items-center justify-center"
      panelClassName="z-10 flex flex-col w-full max-w-2xl h-[min(720px,calc(100vh-3rem))] bg-surface rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      ariaLabelledBy="desktop-tasks-overlay-title"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge-subtle shrink-0">
        <span id="desktop-tasks-overlay-title" className="text-ui-subhead font-medium text-fg">
          Tasks
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 text-fg-muted hover:text-fg transition-colors"
        >
          <HiOutlineX size={20} />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <VaultSidebarTasks
          onFileSelect={(handle, path, line) => {
            openFile(handle, path);
            setPendingScrollTarget({ path, line });
            onClose();
          }}
        />
      </div>
    </OverlayPanel>
  );
}
