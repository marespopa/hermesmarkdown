"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAtomValue } from "jotai";
import { atom_sidebarOpen, atom_sidebarWidth } from "@/app/atoms/ui-atoms";
import { PANE_HEADER_CLASS, PANE_HEADER_HEIGHT, PANE_SECTION_CLASS } from "./pane-header-classes";
import { routeSkeleton, SKELETON_BAR as BAR, SUBPAGE_BACKDROP } from "./RouteSkeletons";

// Paragraph line widths, as a share of the column, so the page reads as text.
const PARAGRAPHS = [
  ["100%", "96%", "98%", "72%"],
  ["100%", "94%", "60%"],
  ["98%", "100%", "92%", "97%", "44%"],
];

// What the editor will show, outlined while the saved vault loads: the
// sidebar (desktop, when it's open), the pane's title bar, and the
// note's text column with a title and a few paragraphs of placeholder lines,
// the panes starting beside the sidebar as the real ones do. It mirrors the
// real layout's classes (`PANE_HEADER_CLASS`, `.editor-canvas`,
// `.editor-sheet`) so the page appears in place with no jump.
export default function EditorSkeleton() {
  // The gate wraps every /editor route: a refresh on Templates, Tasks, Files
  // or Settings outlines that page instead (RouteSkeletons).
  const subpage = routeSkeleton(usePathname());
  const sidebarOpen = useAtomValue(atom_sidebarOpen);
  const sidebarWidth = useAtomValue(atom_sidebarWidth);

  return (
    <div role="status" aria-label="Loading vault" className={`fixed inset-0 z-40 flex select-none ${subpage ? SUBPAGE_BACKDROP : "bg-surface"}`}>
      <span className="sr-only">Loading your vault…</span>
      {subpage ? <div aria-hidden="true" className="flex flex-1 min-w-0">{subpage}</div> : <WorkspaceSkeleton sidebarOpen={sidebarOpen} sidebarWidth={sidebarWidth} />}
    </div>
  );
}

// EditorShell's layout: the panes fill the window past the open sidebar.
function WorkspaceSkeleton({ sidebarOpen, sidebarWidth }: { sidebarOpen: boolean; sidebarWidth: number }) {
  return (
    <div
      aria-hidden="true"
      // Where the page starts: past the open sidebar; the whole window at the mobile-chrome width.
      style={{ "--skeleton-left": `${sidebarOpen ? sidebarWidth : 0}px` } as React.CSSProperties}
      className="relative flex-1 min-w-0 h-full"
    >
      <div className="app-sheet absolute inset-0 min-[769px]:left-[var(--skeleton-left)] overflow-hidden bg-surface flex flex-col">
        <div className={`${PANE_HEADER_CLASS} ${PANE_HEADER_HEIGHT} max-[768px]:hidden`}>
          {/* The title bar: Show sidebar, the note's title in the middle,
              the window's controls at the right. */}
          <div className="flex flex-1 basis-0 items-center">
            {!sidebarOpen && <div className={`${PANE_SECTION_CLASS} !ml-0 w-8`} />}
          </div>
          <div className={`h-4 w-28 rounded-md ${BAR}`} />
          <div className="flex flex-1 basis-0 items-center justify-end">
            <div className={`${PANE_SECTION_CLASS} w-16`} />
          </div>
        </div>

        <div className="editor-canvas flex-1 min-h-0 overflow-hidden">
          {/* MarkdownEditor's sheet: its margins, page padding and text column. */}
          <div className="editor-sheet mx-auto w-full min-h-full pt-8 sm:pt-12 pb-8 pr-5 sm:pr-12 xl:pr-14 [--sheet-pad-left:2.390625rem] sm:[--sheet-pad-left:3rem] xl:[--sheet-pad-left:3.5rem] pl-[var(--sheet-pad-left)]">
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
          className="absolute inset-y-0 left-0 flex flex-col bg-surface paper-grain border-r border-edge-subtle max-[768px]:hidden"
        >
          <div className={`flex items-center gap-2 shrink-0 pl-4 pr-2 sm:pr-3 ${PANE_HEADER_HEIGHT}`}>
            <div className="flex-1">
              <div className={`h-2.5 max-w-24 rounded-full ${BAR}`} />
            </div>
            {/* The plain hide button: an icon in a 28px target. */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center">
              <div className={`h-4 w-4 rounded ${BAR}`} />
            </div>
          </div>
          {/* WorkspaceSidebar's body: the Outline and the Files tree. */}
          <div className="flex-1 min-h-0 px-2 pt-1">
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

// One sidebar row (sidebar-classes' SIDEBAR_ITEM_CLASS): icon and name.
function SidebarItem({ width }: { width: string }) {
  return (
    <div className="flex h-7 items-center gap-2 px-2">
      <div className={`h-[15px] w-[15px] shrink-0 rounded ${BAR}`} />
      <div style={{ width }} className={`h-2.5 rounded-full ${BAR}`} />
    </div>
  );
}
