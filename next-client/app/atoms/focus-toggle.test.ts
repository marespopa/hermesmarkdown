import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import { atom_focusMode, atom_toggleSentenceFocus } from "./ui-atoms";

describe("atom_toggleSentenceFocus", () => {
  it("turns sentence focus on, then back to the earlier level", () => {
    const store = createStore();
    store.set(atom_focusMode, "dim");
    store.set(atom_toggleSentenceFocus);
    expect(store.get(atom_focusMode)).toBe("sentence");
    store.set(atom_toggleSentenceFocus);
    expect(store.get(atom_focusMode)).toBe("dim");
  });

  it("goes back to hiding the interface when sentence focus was already on", () => {
    const store = createStore();
    store.set(atom_focusMode, "sentence");
    store.set(atom_toggleSentenceFocus);
    expect(store.get(atom_focusMode)).toBe("hide");
  });
});
