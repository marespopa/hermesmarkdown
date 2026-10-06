"use client";

import toast from "react-hot-toast";
import Button from "@/app/components/Button";

const UNDO_TOAST_MS = 6000;

// A success toast with an Undo button, for file actions that can be taken
// back (move to Trash, move). Undo dismisses the toast.
export function showUndoToast(message: string, onUndo: () => void) {
  return toast.success(
    (t) => (
      <span className="flex items-center gap-3">
        <span className="min-w-0 flex-1">{message}</span>
        <Button
          variant="unstyled"
          onClick={() => {
            toast.dismiss(t.id);
            onUndo();
          }}
          className="shrink-0 rounded-md px-2 py-0.5 text-ui-footnote font-semibold text-accent hover:bg-black/5 dark:hover:bg-white/10"
        >
          Undo
        </Button>
      </span>
    ),
    { duration: UNDO_TOAST_MS },
  );
}
