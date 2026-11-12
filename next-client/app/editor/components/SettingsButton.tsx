"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HiOutlineCog } from "react-icons/hi";
import CornerButton from "./CornerButton";

// Opens Settings (/editor/settings), as the palette's Open Settings does: just
// before the SearchPill in the window's top-right corner, on the editor
// (EditorShell) and in every page's title bar (ShellPage), in the pill's look.
export default function SettingsButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  return (
    <CornerButton
      icon={<HiOutlineCog size={14} aria-hidden="true" />}
      label="Settings"
      onClick={() => router.push("/editor/settings")}
      className={className}
    />
  );
}
