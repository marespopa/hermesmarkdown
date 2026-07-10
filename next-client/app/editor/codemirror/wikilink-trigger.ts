import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

export type WikiLinkTriggerCallback = (view: EditorView, from: number, to: number) => void;

// Typing "[[" (not part of an existing "[[[") opens the WikiLink dialog
// directly — a separate trigger from the slash menu, mirrors the old
// handleWikiLinkTrigger in use-editor-templates.ts.
export function createWikiLinkTriggerPlugin(callbackRef: { current: WikiLinkTriggerCallback | null }) {
  return ViewPlugin.fromClass(
    class {
      update(update: ViewUpdate) {
        if (!update.docChanged) return;
        const isOwnEdit = update.transactions.some(
          (tr) => tr.isUserEvent("input") && !tr.isUserEvent("input.replace"),
        );
        if (!isOwnEdit) return;
        const pos = update.state.selection.main.head;
        const textBefore = update.state.sliceDoc(Math.max(0, pos - 3), pos);
        if (textBefore.endsWith("[[") && textBefore[textBefore.length - 3] !== "[") {
          callbackRef.current?.(update.view, pos - 2, pos);
        }
      }
    },
  );
}
