"use client";

import React from "react";
import { useAtomValue } from "jotai";
import type { DockZone } from "@/app/types/workspace";
import { atom_paneDrag } from "@/app/atoms/pane-drag-atoms";
import { dockPreviewRect, dockZoneAt } from "../utils/dock-zone";
import { usePaneDrop } from "../hooks/use-pane-drop";

// Transparent layer over a pane while a note or pane is being dragged. The
// pointer picks a zone (edge = split, center = open here) and a translucent
// box shows where the note will land. It sits above the editor, so
// CodeMirror never sees the drop. Nothing is drawn until the pointer is over.
export default function PaneDropLayer({ paneId }: { paneId: string }) {
  const payload = useAtomValue(atom_paneDrag);
  const dropOnPane = usePaneDrop();
  const [zone, setZone] = React.useState<DockZone | null>(null);

  if (!payload || (payload.kind === "pane" && payload.paneId === paneId)) return null;

  const zoneFor = (event: React.DragEvent<HTMLDivElement>) =>
    dockZoneAt(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);

  return (
    <div
      data-testid="pane-drop-layer"
      className="absolute inset-0 z-30"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setZone(zoneFor(event));
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setZone(null);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const dropZone = zoneFor(event);
        setZone(null);
        void dropOnPane(paneId, dropZone);
      }}
    >
      {zone && (
        <div
          aria-hidden="true"
          style={dockPreviewRect(zone)}
          className="pointer-events-none absolute rounded-lg border-2 border-fg-faint bg-black/[0.04] dark:bg-white/[0.06] transition-all duration-100"
        />
      )}
    </div>
  );
}
