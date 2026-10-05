// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import { atom_goHome, atom_homeFeedOpen, atom_homeFeedTopRequest } from "./ui-atoms";

describe("atom_goHome", () => {
  it("opens the feed without asking it to scroll", () => {
    const store = createStore();
    store.set(atom_goHome);
    expect(store.get(atom_homeFeedOpen)).toBe(true);
    expect(store.get(atom_homeFeedTopRequest)).toBe(0);
  });

  it("asks an open feed to scroll back to the top, every time", () => {
    const store = createStore();
    store.set(atom_homeFeedOpen, true);
    store.set(atom_goHome);
    store.set(atom_goHome);
    expect(store.get(atom_homeFeedOpen)).toBe(true);
    expect(store.get(atom_homeFeedTopRequest)).toBe(2);
  });
});
