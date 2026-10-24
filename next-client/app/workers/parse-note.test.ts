// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseNoteFile } from "./parse-note";
import { NEW_BOARD_MARKDOWN, serializeBoard } from "@/app/utils/board/board-format";

describe("parseNoteFile", () => {
  const board = serializeBoard(
    { head: "---\nhermes: board\nboard-version: 1\n---\n\nCaption with [[Real]] and #real\n- [ ] prose task\n\n", tail: "\n" },
    {
      appState: {},
      files: {},
      elements: [{ id: "t", type: "text", text: "[[Secret]] #hidden - [ ] hidden task", versionNonce: 5 }],
    },
  );

  it("ignores a board's JSON in words, links and tags", () => {
    const r = parseNoteFile({ path: "b.board.md", name: "b.board.md", content: board, modifiedAt: 1 });
    expect(r.links).toEqual(["Real"]);
    expect(r.tags).toEqual(["real"]);
    expect(r.wordCount).toBeLessThan(20);
    expect(r.preview).not.toContain("hermes-board");
    expect(r.preview).not.toContain("versionNonce");
  });

  it("extracts only the prose task", () => {
    const r = parseNoteFile({ path: "b.board.md", name: "b.board.md", content: board, modifiedAt: 1 });
    expect(r.tasks.map((t) => t.text)).toEqual(["prose task"]);
  });

  it("parses a plain note as before", () => {
    const r = parseNoteFile({ path: "n.md", name: "n.md", content: "# Title\n[[A]] #x", modifiedAt: 2 });
    expect(r.frontmatter.title).toBe("Title");
    expect(r.links).toEqual(["A"]);
    expect(r.tags).toEqual(["x"]);
  });

  it("handles a fresh board", () => {
    const r = parseNoteFile({ path: "n.board.md", name: "n", content: NEW_BOARD_MARKDOWN, modifiedAt: 2 });
    expect(r.links).toEqual([]);
    expect(r.frontmatter.hermesmarkdown).toBe("board");
  });
});
