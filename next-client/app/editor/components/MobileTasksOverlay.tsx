"use client";

import React from "react";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import { useSetAtom } from "jotai";
import { atom_pendingScrollTarget } from "@/app/atoms/atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import VaultSidebarTasks from "./VaultSidebarTasks";
import { HiOutlineX } from "react-icons/hi";

export default function MobileTasksOverlay({
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
      variant="sheet"
      backdrop="none"
      panelClassName="flex-1 flex flex-col bg-surface animate-in slide-in-from-bottom duration-overlay-panel"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge-subtle shrink-0">
        <span className="text-ui-subhead font-medium text-fg">Tasks</span>
        <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-fg-muted">
          <HiOutlineX size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
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
