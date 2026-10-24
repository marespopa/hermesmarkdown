import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import { atom_sidebarWidth, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "./ui-atoms";

describe("atom_sidebarWidth", () => {
  it("keeps a width within the bounds", () => {
    const store = createStore();
    store.set(atom_sidebarWidth, 300);
    expect(store.get(atom_sidebarWidth)).toBe(300);
    store.set(atom_sidebarWidth, 120);
    expect(store.get(atom_sidebarWidth)).toBe(SIDEBAR_MIN_WIDTH);
    store.set(atom_sidebarWidth, 900);
    expect(store.get(atom_sidebarWidth)).toBe(SIDEBAR_MAX_WIDTH);
  });

  it("opens a width saved under an older minimum at the current one", () => {
    localStorage.setItem("sidebarWidth", "200");
    const store = createStore();
    // Storage is read when the atom mounts.
    const unsubscribe = store.sub(atom_sidebarWidth, () => {});
    expect(store.get(atom_sidebarWidth)).toBe(SIDEBAR_MIN_WIDTH);
    unsubscribe();
    localStorage.removeItem("sidebarWidth");
  });
});
