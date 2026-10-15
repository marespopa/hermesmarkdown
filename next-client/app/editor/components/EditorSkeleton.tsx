"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAtomValue } from "jotai";
import { atom_homeFeedOpen, atom_sidebarOpen, atom_sidebarWidth, atom_userName, atom_vaultOpenBehaviorAppliedFor } from "@/app/atoms/ui-atoms";
import { PANE_HEADER_CLASS, PANE_HEADER_HEIGHT, PANE_SECTION_CLASS } from "./pane-header-classes";
import FeedHeader from "./home-feed/FeedHeader";
import FeedSkeleton, { FeedVaultSkeleton, SkeletonLine } from "./home-feed/FeedSkeleton";
import { SEARCH_PILL_CLASS } from "@/app/components/CommandPalette/palette-model";
import { NO_VAULT_KEY } from "../hooks/use-vault-open-behavior";
import { routeSkeleton, SKELETON_BAR as BAR, SUBPAGE_BACKDROP } from "./RouteSkeletons";

// Paragraph line widths, as a share of the column, so the page reads as text.
const PARAGRAPHS = [
  ["100%", "96%", "98%", "72%"],
  ["100%", "94%", "60%"],
  ["98%", "100%", "92%", "97%", "44%"],
];

// The home feed as it will open (Settings → "On vault open" set to Home, the
// default): the vault bar, the real greeting and date — they don't need the
// vault — over placeholder note rows, and the outline of the floating search
// bar.
export function HomeFeedSkeleton() {
  const userName = useAtomValue(atom_userName);
  // The skeleton is server-rendered (the gate starts out restoring), and the
  // server's clock and locale differ from the browser's. Reading the date only
  // after mount keeps hydration matching; until then the header is bars.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return (
    <div aria-hidden="true" className="relative flex-1 h-full overflow-hidden bg-surface">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-8">
        <FeedVaultSkeleton />
        {now ? (
          <FeedHeader now={now} userName={userName} />
        ) : (
          // FeedHeader's type, so the real greeting and date land in place.
          <div className="pb-8 pt-16 sm:pt-24">
            <span className="mb-1 block">
              <SkeletonLine textClass="text-ui-callout" barClass="h-3.5 w-48" />
            </span>
            <SkeletonLine textClass="text-ui-title-1 sm:text-[2.5rem] sm:leading-[3rem]" barClass="h-8 sm:h-10 w-56 rounded-lg" />
          </div>
        )}
        <FeedSkeleton rows={5} />
      </div>
      <div className="absolute inset-x-0 bottom-5 flex justify-center px-3 sm:px-4">
        <div className="flex w-full max-w-xl items-center gap-1.5 sm:gap-2">
          {/* FeedBar's search pill and new-note button. */}
          <div className={`${SEARCH_PILL_CLASS} glass-panel min-w-0 flex-1`}>
            <div className="h-10 flex-1" />
          </div>
          <div className="h-12 w-12 sm:h-[3.25rem] sm:w-[3.25rem] shrink-0 rounded-full bg-sage shadow-lg" />
        </div>
      </div>
    </div>
  );
}

// What the editor will show, outlined while the saved vault loads: the home
// feed (no sidebar, as on the real feed) — unless this is a refresh of a tab
// that already opened the vault and wasn't on the feed, which lands back in
// the workspace: sidebar (desktop, when it's open), pane
// header with tab pills, and the paper panel with a title and a few
// paragraphs of placeholder lines; the sidebar floats over the panes, as the
// real one does. Both mirror the real layout's classes
// (`PANE_HEADER_CLASS`, `.editor-canvas`, `.editor-sheet`) so the page
// appears in place with no jump.
export default function EditorSkeleton() {
  // The gate wraps every /editor route: a refresh on Templates, Tasks, Files
  // or Settings outlines that page instead (RouteSkeletons).
  const subpage = routeSkeleton(usePathname());
  const appliedFor = useAtomValue(atom_vaultOpenBehaviorAppliedFor);
  // The feed may already be open behind a pending vault (`?view=home` read).
  const isHomeFeedOpen = useAtomValue(atom_homeFeedOpen);
  // Read after mount: sessionStorage and the URL don't exist on the server.
  const [isRefreshInWorkspace, setIsRefreshInWorkspace] = useState(false);
  useEffect(() => {
    setIsRefreshInWorkspace(
      !isHomeFeedOpen &&
      appliedFor !== null &&
      appliedFor !== NO_VAULT_KEY &&
      new URLSearchParams(window.location.search).get("view") !== "home",
    );
  }, [appliedFor, isHomeFeedOpen]);
  const sidebarOpen = useAtomValue(atom_sidebarOpen);
  const sidebarWidth = useAtomValue(atom_sidebarWidth);

  return (
    <div role="status" aria-label="Loading vault" className={`fixed inset-0 z-40 flex select-none ${subpage ? SUBPAGE_BACKDROP : "bg-chrome"}`}>
      <span className="sr-only">Loading your vault…</span>
      {subpage ? <div aria-hidden="true" className="flex flex-1 min-w-0">{subpage}</div> : !isRefreshInWorkspace ? <HomeFeedSkeleton /> : <WorkspaceSkeleton sidebarOpen={sidebarOpen} sidebarWidth={sidebarWidth} />}
    </div>
  );
}

// The sidebar floats over the panes (WorkspaceSidebar), so the sheet keeps
// the full width and only the pane header starts beside it (PaneLeaf).
function WorkspaceSkeleton({ sidebarOpen, sidebarWidth }: { sidebarOpen: boolean; sidebarWidth: number }) {
  return (
    <div
      aria-hidden="true"
      // The open sidebar's width, beside which the text column stays clear
      // (.editor-measure); none at the mobile-chrome width, where it's hidden.
      style={{ "--skeleton-sidebar": `${sidebarOpen ? sidebarWidth : 0}px` } as React.CSSProperties}
      className="relative flex-1 min-w-0 h-full min-[769px]:[--pane-sidebar-inset:var(--skeleton-sidebar)]"
    >
      <div className="absolute inset-0 flex flex-col">
        <div
          className={`${PANE_HEADER_CLASS} ${PANE_HEADER_HEIGHT} max-[768px]:hidden`}
          style={{ marginLeft: sidebarOpen ? sidebarWidth : 0 }}
        >
          {!sidebarOpen && <div className={`${PANE_SECTION_CLASS} !ml-0 mr-2 sm:mr-3 w-8`} />}
          <div className="flex items-center gap-1 flex-1 px-2">
            <div className={`h-8 w-32 rounded-lg ${BAR}`} />
            <div className={`h-8 w-24 rounded-lg ${BAR}`} />
          </div>
          <div className={`${PANE_SECTION_CLASS} w-20`} />
          <div className={`${PANE_SECTION_CLASS} w-16`} />
        </div>

        <div className="editor-canvas flex-1 min-h-0 overflow-hidden">
          {/* MarkdownEditor's sheet: its margins, page padding and text column. */}
          <div className="editor-sheet mx-auto w-full min-h-full mt-6 mb-10 sm:mt-8 sm:mb-14 pt-6 sm:pt-8 pb-12 pr-5 sm:pr-12 xl:pr-14 [--sheet-pad-left:2.390625rem] sm:[--sheet-pad-left:3rem] xl:[--sheet-pad-left:3.5rem] pl-[var(--sheet-pad-left)]">
            <div className="editor-measure flex flex-col">
              <div className={`h-7 w-2/5 rounded-lg mb-10 ${BAR}`} />
              {PARAGRAPHS.map((lines, p) => (
                <div key={p} className="flex flex-col gap-3 mb-8">
                  {lines.map((w, i) => (
                    <div key={i} style={{ width: w }} className={`h-3.5 rounded-full ${BAR}`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          style={{ width: sidebarWidth }}
          className="absolute inset-y-0 left-0 flex flex-col glass-bar max-[768px]:hidden"
        >
          <div className={`flex items-center gap-2 shrink-0 pl-4 pr-2 sm:pr-3 border-b border-edge-subtle ${PANE_HEADER_HEIGHT}`}>
            <div className="flex-1">
              <div className={`h-2.5 max-w-24 rounded-full ${BAR}`} />
            </div>
            {/* The plain hide button: an icon in a 28px target. */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center">
              <div className={`h-4 w-4 rounded ${BAR}`} />
            </div>
          </div>
          {/* WorkspaceSidebar's body: its edge starts below the header. */}
          <div className="flex-1 min-h-0 px-2 pt-2 border-r border-edge-subtle shadow-xl shadow-black/10">
            <div className="flex flex-col gap-px pb-3">
              {["40%", "55%", "38%"].map((w, i) => <SidebarItem key={i} width={w} />)}
            </div>
            {[["70%", "55%"], ["66%", "48%", "74%", "52%", "60%"]].map((items, s) => (
              <div key={s} className="flex flex-col">
                <div className="flex h-7 items-center px-2">
                  <div className={`h-2 w-16 rounded-full ${BAR}`} />
                </div>
                <div className="flex flex-col gap-px pb-3">
                  {items.map((w, i) => <SidebarItem key={i} width={w} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// One sidebar row (WorkspaceSidebar's ITEM_CLASS): icon and name.
function SidebarItem({ width }: { width: string }) {
  return (
    <div className="flex h-7 items-center gap-2 px-2">
      <div className={`h-[15px] w-[15px] shrink-0 rounded ${BAR}`} />
      <div style={{ width }} className={`h-2.5 rounded-full ${BAR}`} />
    </div>
  );
}
