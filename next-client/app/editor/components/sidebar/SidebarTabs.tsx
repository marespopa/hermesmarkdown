"use client";

import React from "react";
import Button, { SEGMENT_TRACK_CLASS } from "@/app/components/Button";
import type { SidebarTab } from "@/app/atoms/sidebar-tab-atoms";

const TABS: { id: SidebarTab; label: string }[] = [
  { id: "files", label: "Files" },
  { id: "tags", label: "Tags" },
];

// The switch between the sidebar's two views, Files and Tags, above its
// content. The tab changes in the same frame as the click.
export default function SidebarTabs({ tab, onChange }: { tab: SidebarTab; onChange: (tab: SidebarTab) => void }) {
  return (
    <div role="tablist" aria-label="Sidebar view" className={`mx-2 mb-1 flex ${SEGMENT_TRACK_CLASS}`}>
      {TABS.map(({ id, label }) => (
        <Button key={id} variant="segment" role="tab" aria-selected={tab === id} onClick={() => onChange(id)} className="flex-1">
          {label}
        </Button>
      ))}
    </div>
  );
}
