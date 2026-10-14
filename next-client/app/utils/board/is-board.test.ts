// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isBoard } from "./is-board";

describe("isBoard", () => {
  it("is true for hermes: board frontmatter under any name", () => {
    expect(isBoard("notes/Sketch.md", "---\nhermes: board\n---\n")).toBe(true);
    expect(isBoard("a.md", '---\ntitle: x\nhermes: "board"\n---\nbody')).toBe(true);
    expect(isBoard("a.md", "---\nhermes: 'board'\n---\n")).toBe(true);
  });

  it("is true for an empty .board.md", () => {
    expect(isBoard("Untitled.board.md", "")).toBe(true);
    expect(isBoard("Untitled.board.md", "  \n")).toBe(true);
  });

  it("is false for a .board.md with text but no key", () => {
    expect(isBoard("Untitled.board.md", "Some text")).toBe(false);
  });

  it("is false for a draft and for plain notes", () => {
    expect(isBoard("draft", "---\nhermes: board\n---\n")).toBe(false);
    expect(isBoard("Note.md", "# Hello")).toBe(false);
    expect(isBoard("Note.md", "---\nhermes: other\n---\n")).toBe(false);
  });
});
