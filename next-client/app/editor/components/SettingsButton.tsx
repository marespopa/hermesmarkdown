"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HiOutlineCog } from "react-icons/hi";
import Button from "@/app/components/Button";
import Tooltip from "@/app/components/Tooltip";
import { PILL_BUTTON_CLASS } from "./pane-header-classes";

// Opens Settings (/editor/settings), as the palette's Open Settings does: just
// before the SearchPill in the window's top-right corner, on the editor
// (EditorShell) and in every page's title bar (ShellPage), in the pill's look.
export default function SettingsButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  return (
    <Tooltip label="Settings" position="bottom" portal>
      <Button
        variant="unstyled"
        onClick={() => router.push("/editor/settings")}
        aria-label="Settings"
        className={`${PILL_BUTTON_CLASS} ${className}`}
      >
        <HiOutlineCog size={14} aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}
