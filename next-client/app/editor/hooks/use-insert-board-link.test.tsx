import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useInsertBoardLink } from "./use-insert-board-link";

const prompt = vi.fn();
vi.mock("@/app/hooks/use-dialog", () => ({ useDialog: () => ({ prompt }) }));

function setup(doc: string, caret: number, link: string | null = "inbox/Sprint plan.board") {
  const view = new EditorView({ state: EditorState.create({ doc, selection: EditorSelection.cursor(caret) }) });
  const createLinkedBoard = vi.fn().mockResolvedValue(link);
  const { result } = renderHook(() => useInsertBoardLink({ viewRef: { current: view }, createLinkedBoard }));
  return { view, createLinkedBoard, insert: result.current };
}

describe("useInsertBoardLink", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the named board and links it at the caret", async () => {
    prompt.mockResolvedValue("Sprint plan");
    const { view, createLinkedBoard, insert } = setup("Plan: \nNext", 6);
    await insert();
    expect(prompt).toHaveBeenCalledWith("Board name:", "Untitled", "New board");
    expect(createLinkedBoard).toHaveBeenCalledWith("Sprint plan.board");
    expect(view.state.doc.toString()).toBe("Plan: [[inbox/Sprint plan.board]]\nNext");
    expect(view.state.selection.main.head).toBe("Plan: [[inbox/Sprint plan.board]]".length);
    view.destroy();
  });

  it("inserts nothing when cancelled or when creation fails", async () => {
    prompt.mockResolvedValue(null);
    const cancelled = setup("Plan", 4);
    await cancelled.insert();
    expect(cancelled.createLinkedBoard).not.toHaveBeenCalled();
    expect(cancelled.view.state.doc.toString()).toBe("Plan");
    cancelled.view.destroy();

    prompt.mockResolvedValue("Sprint plan");
    const failed = setup("Plan", 4, null);
    await failed.insert();
    expect(failed.view.state.doc.toString()).toBe("Plan");
    failed.view.destroy();
  });
});
