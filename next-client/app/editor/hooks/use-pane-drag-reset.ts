import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { atom_paneDrag } from "@/app/atoms/pane-drag-atoms";

// Clears the pane drag when any drag ends (a drop, Esc, or a release outside
// a pane). A relocated pane's grip unmounts before its own dragend, so the
// source can't be trusted to do it. Not cleared on `drop`: React's onDrop
// still needs the payload and runs after a window capture listener.
export function usePaneDragReset() {
  const setPaneDrag = useSetAtom(atom_paneDrag);
  useEffect(() => {
    const reset = () => setPaneDrag(null);
    window.addEventListener("dragend", reset, true);
    return () => window.removeEventListener("dragend", reset, true);
  }, [setPaneDrag]);
}
