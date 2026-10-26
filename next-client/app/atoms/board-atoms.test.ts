import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import { atom_activeIsBoard } from "./board-atoms";
import { atom_activeFilePath, atom_fileContent } from "./file-atoms";

describe("atom_activeIsBoard", () => {
  it("is true for a board in front and false for a note", () => {
    const store = createStore();
    store.set(atom_fileContent("plan.md"), "---\nhermes: board\n---\n");
    store.set(atom_activeFilePath, "plan.md");
    expect(store.get(atom_activeIsBoard)).toBe(true);
    store.set(atom_fileContent("plan.md"), "Just a note");
    expect(store.get(atom_activeIsBoard)).toBe(false);
  });
});
