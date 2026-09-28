import { useState } from "react";
import type React from "react";
import { useSetAtom } from "jotai";
import { atom_moveTab } from "@/app/atoms/atoms";

const TAB_MIME = "application/hermes-tab";

// Drag-and-drop for pane tabs: drag a tab within the strip or onto another
// pane's strip to move it. The payload carries the source pane and file;
// text/plain is set too for browsers that drop custom types.
export function useTabDragDrop(paneId: string) {
  const moveTab = useSetAtom(atom_moveTab);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, path: string) => {
    const data = JSON.stringify({ sourcePaneId: paneId, filePath: path });
    e.dataTransfer.setData(TAB_MIME, data);
    e.dataTransfer.setData("text/plain", data);
    e.dataTransfer.effectAllowed = "move";

    // Use the tab itself as the drag image, offset to roughly its centre-left.
    const target = e.currentTarget as HTMLElement;
    if (e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(target, 20, 18);
    target.classList.add("opacity-20");
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("opacity-20");
    setDraggedOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index?: number) => {
    const types = e.dataTransfer.types;
    if (types.includes(TAB_MIME) || types.includes("text/plain")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (index !== undefined) setDraggedOverIndex(index);
    }
  };

  const handleDragLeave = () => setDraggedOverIndex(null);

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverIndex(null);

    const data = e.dataTransfer.getData(TAB_MIME) || e.dataTransfer.getData("text/plain");
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (!parsed.sourcePaneId || !parsed.filePath) return;
      moveTab({ sourcePaneId: parsed.sourcePaneId, targetPaneId: paneId, filePath: parsed.filePath, targetIndex });
    } catch {
      // Not our data
    }
  };

  return { draggedOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop };
}
