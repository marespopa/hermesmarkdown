"use client";

import { useCallback } from "react";
import type { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { useDialog } from "@/app/hooks/use-dialog";
import { boardBaseName } from "./use-create-board";

interface UseInsertBoardLinkOptions {
  viewRef: React.RefObject<EditorView | null>;
  /** Creates `<name>.board.md` (or finds it) and returns its link path, or null. */
  createLinkedBoard: (name: string) => Promise<string | null>;
}

// `/board` in the slash menu: asks the board's name, creates it in the New
// Notes folder without opening it (a board of that name already there is
// linked as it is), and inserts `[[<path>]]` where the caret was. Cancel or
// a blank name inserts nothing.
export function useInsertBoardLink({ viewRef, createLinkedBoard }: UseInsertBoardLinkOptions) {
  const dialog = useDialog();
  return useCallback(async () => {
    const start = viewRef.current;
    if (!start) return;
    const at = start.state.selection.main.head;
    const baseName = boardBaseName(String((await dialog.prompt("Board name:", "Untitled", "New board")) ?? ""));
    if (!baseName) return;
    const link = await createLinkedBoard(baseName);
    // The tab may have been switched or closed while the dialog was open.
    const view = viewRef.current;
    if (!link || !view) return;
    const pos = Math.min(at, view.state.doc.length);
    const insert = `[[${link}]]`;
    view.dispatch({
      changes: { from: pos, insert },
      selection: EditorSelection.cursor(pos + insert.length),
      userEvent: "input.replace.template",
    });
    view.focus();
  }, [viewRef, dialog, createLinkedBoard]);
}
