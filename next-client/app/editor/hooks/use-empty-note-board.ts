import { useCallback } from "react";
import type { EditorView } from "@codemirror/view";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { NEW_BOARD_MARKDOWN } from "@/app/utils/board/board-format";
import { useCreateBoard } from "./use-create-board";

interface UseEmptyNoteBoardOptions {
  viewRef: React.RefObject<EditorView | null>;
  /** Vault path of the note, or "draft". */
  filePath: string;
}

// The empty-note "Board" pill: an empty vault note becomes a board in place
// (its text is replaced by the board frontmatter and an empty scene, and the
// pane switches to the canvas). The draft can't be a board, so it asks for a
// name and creates `<name>.board.md` instead, like the New board command.
export function useEmptyNoteBoard({ viewRef, filePath }: UseEmptyNoteBoardOptions) {
  const { createFile } = useFileSystem();
  const createBoard = useCreateBoard(createFile);
  return useCallback(() => {
    const view = viewRef.current;
    if (filePath === "draft" || !view) {
      void createBoard();
      return;
    }
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: NEW_BOARD_MARKDOWN } });
  }, [createBoard, filePath, viewRef]);
}
