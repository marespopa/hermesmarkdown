"use client";

import React, { useCallback } from "react";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { HiOutlineCog, HiOutlineX } from "react-icons/hi";
import { atom_mobileDrawerOpen, atom_mobileDrawerTab, type MobileDrawerTab } from "@/app/atoms/mobile-drawer-atoms";
import Button, { SEGMENT_TRACK_CLASS } from "@/app/components/Button";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import FilesPane from "./FilesPane";
import TagsPane from "./TagsPane";
import { useSwipeToClose } from "./use-edge-swipe";

const TABS: { id: MobileDrawerTab; label: string }[] = [
  { id: "files", label: "Files" },
  { id: "tags", label: "Tags" },
];

// The phone's navigation drawer, from the left edge: Files and Tags tabs,
// with Settings at the foot. Both tabs stay mounted (the inactive one
// hidden), so each keeps its scroll position. The back gesture, Escape, the
// backdrop, a swipe toward the edge and × close it (OverlayPanel). Picking a
// note or a tag puts the drawer away first, then does the slow work behind it.
export default function MobileDrawer() {
  const router = useRouter();
  const [open, setOpen] = useAtom(atom_mobileDrawerOpen);
  const [tab, setTab] = useAtom(atom_mobileDrawerTab);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const swipe = useSwipeToClose("left", close);

  const goTo = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router, setOpen]);

  return (
    <OverlayPanel
      isOpen={open}
      onClose={close}
      variant="edge-panel"
      exitDurationMs={200}
      lockScroll
      containerClassName="right-0"
      backdropClassName={`backdrop-blur-none duration-overlay-backdrop motion-reduce:animate-none ${open ? "animate-in fade-in" : "animate-out fade-out"}`}
      panelClassName={`flex h-full w-[85vw] max-w-sm flex-col bg-overlay border-r border-edge-subtle font-sans duration-overlay-panel ease-layout motion-reduce:animate-none ${open ? "animate-in slide-in-from-left" : "animate-out slide-out-to-left"}`}
      ariaLabelledBy="mobile-drawer-title"
    >
      <div className="flex h-full min-h-0 flex-col" {...swipe}>
        <div className="flex shrink-0 items-center gap-2 border-b border-edge-subtle px-3 py-2">
          <h2 id="mobile-drawer-title" className="sr-only">Navigation</h2>
          <div role="tablist" aria-label="Library" className={`flex flex-1 ${SEGMENT_TRACK_CLASS}`}>
            {TABS.map(({ id, label }) => (
              <Button
                key={id}
                variant="segment"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className="flex-1"
              >
                {label}
              </Button>
            ))}
          </div>
          <Button variant="close" onClick={close} aria-label="Close navigation" title="Close">
            <HiOutlineX size={16} aria-hidden="true" />
          </Button>
        </div>
        <div data-scroll-root className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div role="tabpanel" hidden={tab !== "files"} aria-label="Files">
            <FilesPane onOpened={close} />
          </div>
          <div role="tabpanel" hidden={tab !== "tags"} aria-label="Tags">
            <TagsPane onNavigate={goTo} />
          </div>
        </div>
        <div className="shrink-0 border-t border-edge-subtle p-3">
          <Button variant="secondary" onClick={() => goTo("/editor/settings")} className="w-full">
            <HiOutlineCog size={16} aria-hidden="true" />
            Settings
          </Button>
        </div>
      </div>
    </OverlayPanel>
  );
}
