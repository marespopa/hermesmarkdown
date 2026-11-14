import { useCallback } from "react";
import { useStore } from "jotai";
import toast from "react-hot-toast";
import { atom_fileContent, atom_liveHandles, atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_boardMarkdownPaths } from "@/app/atoms/board-atoms";
import { useDialog } from "@/app/hooks/use-dialog";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { flushBoardWrite } from "@/app/utils/board/board-flush";
import { boardHasDrawing, boardToNote } from "@/app/utils/board/board-to-note";

const BOARD_NAME = /\.board\.md$/i;

// "Convert Board to Note": the way back from a board (the empty-note Board
// pill, New board) to a plain Markdown note. The drawing and the board
// frontmatter are taken out and the text around the drawing stays; the pane
// switches to the text editor at once. A board with a drawing asks first,
// since the drawing is lost. `Name.board.md` is renamed `Name.md` first: an
// empty `.board.md` file would still open as a board.
export function useConvertBoardToNote() {
  const store = useStore();
  const dialog = useDialog();
  const { renameFile } = useFileSystem();
  return useCallback(async (path: string) => {
    // A stroke still waiting to be written would put the drawing back.
    flushBoardWrite(path);
    const content = store.get(atom_openFiles)[path]?.content;
    if (content === undefined) return;
    if (boardHasDrawing(content)) {
      const confirmed = await dialog.confirm(
        "Convert this board to a note?",
        "Convert Board to Note",
        "Convert",
        undefined,
        "The drawing is removed. The text around it stays.",
      );
      if (!confirmed) return;
    }

    let notePath = path;
    const name = path.split("/").pop() ?? path;
    if (BOARD_NAME.test(name)) {
      const handle = store.get(atom_liveHandles(path));
      const renamed = handle ? await renameFile(handle, name.replace(BOARD_NAME, ".md"), path) : undefined;
      if (!renamed) {
        toast.error("Couldn't rename the board, so it was left as it is.");
        return;
      }
      notePath = renamed;
    }

    const current = store.get(atom_openFiles)[notePath]?.content ?? content;
    flushBoardWrite(notePath);
    store.set(atom_fileContent(notePath), boardToNote(current));
    // The note is no longer a board "opened as Markdown".
    const asMarkdown = store.get(atom_boardMarkdownPaths);
    if (asMarkdown.has(path) || asMarkdown.has(notePath)) {
      const next = new Set(asMarkdown);
      next.delete(path);
      next.delete(notePath);
      store.set(atom_boardMarkdownPaths, next);
    }
  }, [dialog, renameFile, store]);
}
