"use client";

import React, { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { atom_onVaultOpen, atom_sidebarOpen, atom_sidebarWidth, atom_userName, atom_vaultOpenBehaviorAppliedFor } from "@/app/atoms/ui-atoms";
import { PANE_HEADER_CLASS, PANE_HEADER_HEIGHT } from "./pane-header-classes";
import FeedHeader from "./home-feed/FeedHeader";
import FeedSkeleton from "./home-feed/FeedSkeleton";

// One placeholder shape. Static black / white so the opacity modifier works
// (the var-backed tokens drop it); pulses only when motion is allowed.
const BAR = "bg-black/[0.06] dark:bg-white/[0.08] motion-safe:animate-pulse";

// Paragraph line widths, as a share of the column, so the page reads as text.
const PARAGRAPHS = [
  ["100%", "96%", "98%", "72%"],
  ["100%", "94%", "60%"],
  ["98%", "100%", "92%", "97%", "44%"],
];

// The home feed as it will open (Settings → "On vault open" set to Home, the
// default): the real greeting and date — they don't need the vault — over
// placeholder note rows, and the outline of the floating search bar.
function HomeFeedSkeleton() {
  const userName = useAtomValue(atom_userName);
  // The skeleton is server-rendered (the gate starts out restoring), and the
  // server's clock and locale differ from the browser's. Reading the date only
  // after mount keeps hydration matching; until then the header is bars.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return (
    <div aria-hidden="true" className="relative flex-1 h-full overflow-hidden bg-surface">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-8">
        {now ? (
          <FeedHeader now={now} userName={userName} />
        ) : (
          <div className="pb-8 pt-16 sm:pt-24">
            <div className={`h-4 w-48 mb-3 rounded-full ${BAR}`} />
            <div className={`h-9 sm:h-11 w-56 rounded-lg ${BAR}`} />
          </div>
        )}
        <FeedSkeleton rows={5} />
      </div>
      <div className="absolute inset-x-0 bottom-5 flex justify-center px-3 sm:px-4">
        <div className="flex w-full max-w-xl items-center gap-1.5 sm:gap-2">
          <div className="h-[3.25rem] flex-1 rounded-full border border-edge bg-chrome shadow-lg" />
          <div className="h-12 w-12 sm:h-[3.25rem] sm:w-[3.25rem] shrink-0 rounded-full bg-surface-raised shadow-lg" />
        </div>
      </div>
    </div>
  );
}

// What the editor will show, outlined while the saved vault loads. With
// "On vault open" set to Home, the home feed (no sidebar, as on the real
// feed) — unless this is a refresh of a tab that already opened the vault
// and wasn't on the feed, which lands back in the workspace. Otherwise the workspace: sidebar (desktop, when it's open), pane
// header with tab pills, and the paper panel with a title and a few
// paragraphs of placeholder lines. Both mirror the real layout's classes
// (`PANE_HEADER_CLASS`, `.editor-canvas`, `.editor-sheet`) so the page
// appears in place with no jump.
export default function EditorSkeleton() {
  const onVaultOpen = useAtomValue(atom_onVaultOpen);
  const appliedFor = useAtomValue(atom_vaultOpenBehaviorAppliedFor);
  // Read after mount: sessionStorage and the URL don't exist on the server.
  const [isRefreshInWorkspace, setIsRefreshInWorkspace] = useState(false);
  useEffect(() => {
    setIsRefreshInWorkspace(appliedFor !== null && new URLSearchParams(window.location.search).get("view") !== "home");
  }, [appliedFor]);
  const sidebarOpen = useAtomValue(atom_sidebarOpen);
  const sidebarWidth = useAtomValue(atom_sidebarWidth);

  return (
    <div role="status" aria-label="Loading vault" className="fixed inset-0 z-40 flex bg-chrome select-none">
      <span className="sr-only">Loading your vault…</span>
      {onVaultOpen === "home" && !isRefreshInWorkspace ? <HomeFeedSkeleton /> : <WorkspaceSkeleton sidebarOpen={sidebarOpen} sidebarWidth={sidebarWidth} />}
    </div>
  );
}

function WorkspaceSkeleton({ sidebarOpen, sidebarWidth }: { sidebarOpen: boolean; sidebarWidth: number }) {
  return (
    <>
      {sidebarOpen && (
        <div
          aria-hidden="true"
          style={{ width: sidebarWidth }}
          className="shrink-0 h-full flex flex-col bg-chrome border-r border-edge-subtle max-[768px]:hidden"
        >
          <div className={`flex items-center gap-2 shrink-0 pl-4 pr-2 sm:pr-3 border-b border-edge-subtle ${PANE_HEADER_HEIGHT}`}>
            <div className={`flex-1 h-2.5 max-w-24 rounded-full ${BAR}`} />
            <div className={`w-8 h-8 ml-auto rounded-full ${BAR}`} />
          </div>
          <div className="flex flex-col gap-3 px-4 pt-4">
            <div className={`h-2 w-16 rounded-full ${BAR}`} />
            {["70%", "55%", "62%"].map((w, i) => (
              <div key={i} style={{ width: w }} className={`h-3 rounded-full ${BAR}`} />
            ))}
            <div className={`h-2 w-12 mt-3 rounded-full ${BAR}`} />
            {["66%", "48%", "74%", "52%", "60%"].map((w, i) => (
              <div key={i} style={{ width: w }} className={`h-3 rounded-full ${BAR}`} />
            ))}
          </div>
        </div>
      )}

      <div aria-hidden="true" className="flex-1 min-w-0 flex flex-col">
        <div className={`${PANE_HEADER_CLASS} ${PANE_HEADER_HEIGHT} max-[768px]:hidden`}>
          {!sidebarOpen && <div className={`w-8 h-8 mr-2 sm:mr-3 rounded-full ${BAR}`} />}
          <div className="flex items-center gap-1 flex-1 px-2">
            <div className={`h-8 w-32 rounded-lg ${BAR}`} />
            <div className={`h-8 w-24 rounded-lg ${BAR}`} />
          </div>
          <div className={`h-8 w-20 ml-2 rounded-full ${BAR}`} />
          <div className={`h-8 w-16 ml-2 rounded-full ${BAR}`} />
        </div>

        <div className="editor-canvas flex-1 min-h-0 overflow-hidden">
          <div
            className="editor-sheet mx-auto w-full mt-6 mb-10 sm:mt-8 sm:mb-14 pt-6 sm:pt-8 pb-12"
            style={{ paddingInline: "clamp(1.5rem, 8vw, 7rem)" }}
          >
            <div className="max-w-2xl mx-auto flex flex-col">
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
    </>
  );
}
