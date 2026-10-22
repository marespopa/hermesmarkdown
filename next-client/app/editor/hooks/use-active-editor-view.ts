import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useSetAtom } from "jotai";
import type { EditorView } from "@codemirror/view";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";

// AI actions and palette editor commands are single app-wide instances, not
// one per pane: they act on whichever view `atom_activeEditorView` points at,
// so an editor claims that slot while it is the active pane's. A read-only
// editor (a preview pane) passes `enabled: false` and never claims it, nor
// takes focus.
//
// Returns the callback to run when the CodeMirror view is created: it
// registers the view and auto-focuses it so typing works right after opening
// (skipped for inactive split panes).
export function useActiveEditorView(
  viewRef: RefObject<EditorView | null>,
  { isActivePane, enabled }: { isActivePane: boolean; enabled: boolean },
): (view: EditorView) => void {
  const setActiveEditorView = useSetAtom(atom_activeEditorView);
  const registeredViewRef = useRef<EditorView | null>(null);

  const onCreated = useCallback((view: EditorView) => {
    if (!enabled || !isActivePane) return;
    registeredViewRef.current = view;
    setActiveEditorView(view);
    view.focus();
  }, [enabled, isActivePane, setActiveEditorView]);

  useEffect(() => {
    if (!enabled || !isActivePane) return;
    const view = viewRef.current;
    if (view) {
      registeredViewRef.current = view;
      setActiveEditorView(view);
    }
    // Cleared on unmount/deactivation so a later command can't target a
    // torn-down view.
    return () => {
      const registered = registeredViewRef.current;
      if (registered) {
        setActiveEditorView((current) => (current === registered ? null : current));
      }
      registeredViewRef.current = null;
    };
  }, [enabled, isActivePane, setActiveEditorView, viewRef]);

  return onCreated;
}
