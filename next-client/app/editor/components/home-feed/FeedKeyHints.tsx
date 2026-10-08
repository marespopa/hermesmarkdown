"use client";

import React from "react";

// The feed's keys, vim-style, as `[keys, action]`. Keep in step with
// HomeFeed's keydown handler.
export const FEED_KEY_HINTS: [string[], string][] = [
  [["j", "k"], "move"],
  [["gg", "G"], "top/end"],
  [["o"], "open"],
  [["p"], "pin"],
  [["/"], "search"],
  [["esc"], "back"],
];

const KBD_CLASS = "rounded border border-edge px-1 font-mono text-ui-micro leading-4 text-fg-muted";

// One line of keycaps above the feed's search bar, hidden below `sm`. On
// the search pill's chrome (background, edge), so the notes scrolling
// underneath don't show through.
// Not hidden on touch screens: a tablet with a keyboard reports `hover: none`
// too, and that's where the keys matter.
export default function FeedKeyHints() {
  return (
    <p
      aria-label="Keyboard: j and k move, g g and G jump to the top and end, o opens, p pins, slash searches, Escape goes back"
      className="hidden flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-edge bg-chrome px-3 py-1 text-ui-caption text-fg-muted shadow-sm sm:inline-flex"
    >
      {FEED_KEY_HINTS.map(([keys, action]) => (
        <span key={action} aria-hidden="true" className="inline-flex items-center gap-1">
          {keys.map((key) => <kbd key={key} className={KBD_CLASS}>{key}</kbd>)}
          <span className="ml-0.5">{action}</span>
        </span>
      ))}
    </p>
  );
}
