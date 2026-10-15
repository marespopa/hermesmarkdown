import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { NEW_BOARD_MARKDOWN } from "@/app/utils/board/board-format";
import { useEmptyNoteBoard } from "./use-empty-note-board";

const createBoard = vi.fn();
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ createFile: vi.fn() }) }));
vi.mock("./use-create-board", () => ({ useCreateBoard: () => createBoard }));

function setup(filePath: string) {
  const view = new EditorView({ state: EditorState.create({ doc: "\n" }) });
  const viewRef = { current: view };
  const { result } = renderHook(() => useEmptyNoteBoard({ viewRef, filePath }));
  return { view, startBoard: result.current };
}

describe("useEmptyNoteBoard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("turns an empty vault note into a board in place", () => {
    const { view, startBoard } = setup("notes/sketch.md");
    startBoard();
    expect(view.state.doc.toString()).toBe(NEW_BOARD_MARKDOWN);
    expect(createBoard).not.toHaveBeenCalled();
  });

  it("creates a new board file from the draft", () => {
    const { view, startBoard } = setup("draft");
    startBoard();
    expect(createBoard).toHaveBeenCalled();
    expect(view.state.doc.toString()).toBe("\n");
  });
});
