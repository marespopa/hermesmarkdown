"use client";

import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { formatShortcut } from "@/app/utils/platform";

const KBD_CLASS = "rounded-md border border-edge-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-ui-caption text-fg";

// A quiet line of first things to know, under an empty feed's cards. The
// palette shortcut is left out on touch screens, where the menu button opens it.
export default function FeedTips() {
  const isMobileChrome = useIsMobileChrome();
  const tips = [
    ...(isMobileChrome ? [] : [{ keys: formatShortcut("k"), text: "command palette" }]),
    { keys: "/", text: "in a note for blocks" },
    { keys: "[[", text: "to link notes" },
  ];
  return (
    <ul aria-label="Tips" className="flex flex-wrap gap-x-5 gap-y-2 px-4 text-ui-footnote text-fg-muted">
      {tips.map((tip) => (
        <li key={tip.keys} className="flex items-center gap-1.5">
          <kbd className={KBD_CLASS}>{tip.keys}</kbd>
          {tip.text}
        </li>
      ))}
    </ul>
  );
}
