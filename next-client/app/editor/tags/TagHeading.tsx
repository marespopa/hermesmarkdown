"use client";

import React from "react";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import Button from "@/app/components/Button";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { usePins } from "@/app/hooks/use-pins";

// The Tags page's heading for the chosen tag (`#release`), and beside it on
// desktop a Pin button that adds the tag to the sidebar's Pinned section.
// Once pinned it reads Pinned and is disabled: unpinning is the pinned row's
// own menu. Mobile has no sidebar, so no button.
export default function TagHeading({ tag, hasVault }: { tag: string; hasVault: boolean }) {
  const isMobileChrome = useIsMobileChrome();
  const { isPinned, pin } = usePins();
  const pinned = isPinned("tag", tag);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <h1 className="min-w-0 flex-1 break-words text-ui-title-2 font-semibold tracking-tight">#{tag}</h1>
      {!isMobileChrome && (
        <Button
          variant="secondary"
          isDisabled={!hasVault || pinned}
          onClick={() => void pin("tag", tag)}
          title={pinned ? "Unpin it from its row in the sidebar's Pinned section" : "Pin to the sidebar"}
          className="gap-1.5"
        >
          {pinned ? <TbPinnedFilled size={15} aria-hidden="true" /> : <TbPinned size={15} aria-hidden="true" />}
          {pinned ? "Pinned" : "Pin"}
        </Button>
      )}
    </div>
  );
}
