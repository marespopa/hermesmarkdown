"use client";

import { useEffect, type MutableRefObject } from "react";
import { useAutoSave } from "@/app/hooks/use-auto-save";

interface AutoSaveProps {
  /** Called when the draft's autosave wait is over (it may save itself as a file). */
  onDraftChange?: () => void;
  /** Gets the pending save's flush, for the editor's shortcuts. */
  flushRef: MutableRefObject<() => Promise<void>>;
}

// Runs autosave (useAutoSave) for the editor page. Its own component: the
// hook follows the note's text, so it renders on every keystroke, and on its
// own that's this empty element rather than the whole editor page.
export default function AutoSave({ onDraftChange, flushRef }: AutoSaveProps) {
  const { flush } = useAutoSave(onDraftChange);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush, flushRef]);
  return null;
}
