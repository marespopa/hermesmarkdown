"use client";

import React from "react";
import type { VimStatus } from "@/app/editor/hooks/use-vim-status";

const MODE_LABEL: Record<string, string> = {
  normal: "Normal",
  insert: "Insert",
  visual: "Visual",
  "visual line": "Visual line",
  "visual block": "Visual block",
  replace: "Replace",
};

// Vim's mode, pending keys and `:` / `/` prompt, floating over the bottom of
// the pane on the same chrome pill as the palette's search. Hidden while inserting: writing is the default state, so the page
// only shows Vim when you've left it.
//
// The pill stays mounted (opacity only, never `invisible`): the library
// focuses the prompt's input synchronously when it opens, before React has
// re-rendered, so the host must already be focusable.
export default function VimStatusPill({ status, hostRef }: {
  status: VimStatus;
  hostRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { mode, prompting } = status;
  const visible = prompting || mode !== "insert";
  const dot = mode.startsWith("visual") ? "bg-sage" : "bg-accent";

  return (
    <div className="pointer-events-none sticky bottom-0 z-20 h-0">
      <div
        aria-hidden={!visible}
        className={`absolute bottom-4 flex items-center gap-2 rounded-full border border-edge bg-chrome px-3 py-1 text-ui-caption text-fg-muted shadow-sm
          transition-[opacity,transform] duration-150
          ${prompting ? "left-1/2 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2" : "right-4"}
          ${visible ? "pointer-events-auto opacity-100" : "translate-y-1 opacity-0"}`}
      >
        {!prompting && (
          <span role="status" className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
            {MODE_LABEL[mode] ?? mode}
          </span>
        )}
        {/* Owned by the Vim library, not React: see useVimStatus. */}
        <div ref={hostRef} className="vim-status-host" />
      </div>
    </div>
  );
}
