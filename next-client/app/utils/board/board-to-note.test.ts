import { describe, expect, it } from "vitest";
import { NEW_BOARD_MARKDOWN } from "./board-format";
import { boardHasDrawing, boardToNote } from "./board-to-note";
import { isBoard } from "./is-board";

const fence = (elements: string) =>
  '```hermes-board\n{"type":"hermes-board","version":1,"source":"excalidraw",\n"appState":{},\n"files":{},\n"elements":[\n' + elements + "\n]}\n```";
const DRAWN = fence('{"id":"a","type":"rectangle"}');

describe("boardToNote", () => {
  it("turns a new board into an empty note", () => {
    expect(boardToNote(NEW_BOARD_MARKDOWN)).toBe("");
  });

  it("keeps the text around the drawing and the other frontmatter", () => {
    const board = `---\ntitle: Sprint plan\nhermes: board\nboard-version: 1\ntags: [plan]\n---\n\nA caption.\n\n${DRAWN}\n\nNotes below.\n`;
    const note = boardToNote(board);
    expect(note).toBe("---\ntitle: Sprint plan\ntags: [plan]\n---\n\nA caption.\n\nNotes below.\n");
    expect(isBoard("Sprint plan.md", note)).toBe(false);
  });

  it("drops the frontmatter block when only the board keys were in it", () => {
    expect(boardToNote(`---\nhermes: board\nboard-version: 1\n---\n\nA caption.\n\n${DRAWN}\n`)).toBe("A caption.\n");
  });
});

describe("boardHasDrawing", () => {
  it("is false for an empty board and one with only deleted elements", () => {
    expect(boardHasDrawing(NEW_BOARD_MARKDOWN)).toBe(false);
    expect(boardHasDrawing(`---\nhermes: board\n---\n\n${fence('{"id":"a","type":"rectangle","isDeleted":true}')}\n`)).toBe(false);
  });

  it("is true for a drawing, and for one that can't be read", () => {
    expect(boardHasDrawing(`---\nhermes: board\n---\n\n${DRAWN}\n`)).toBe(true);
    expect(boardHasDrawing("---\nhermes: board\n---\n\n```hermes-board\nnot json\n```\n")).toBe(true);
  });
});
