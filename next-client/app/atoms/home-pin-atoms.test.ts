import { createStore } from "jotai";
import { beforeEach, describe, expect, it } from "vitest";
import { atom_forgetHomePins, atom_homePinnedPaths, atom_toggleHomePin } from "./home-pin-atoms";
import { atom_homePins } from "./ui-atoms";
import { atom_vaultHandle } from "./vault-atoms";

function storeWithVault(name: string | null) {
  const store = createStore();
  if (name) store.set(atom_vaultHandle, { name } as FileSystemDirectoryHandle);
  return store;
}

describe("home pins", () => {
  beforeEach(() => localStorage.clear());

  it("pins newest first, unpins on a second toggle, and keeps each vault's pins apart", () => {
    const store = storeWithVault("work");
    store.set(atom_toggleHomePin, "a.md");
    store.set(atom_toggleHomePin, "b.md");
    expect(store.get(atom_homePinnedPaths)).toEqual(["b.md", "a.md"]);

    store.set(atom_toggleHomePin, "a.md");
    expect(store.get(atom_homePinnedPaths)).toEqual(["b.md"]);

    store.set(atom_vaultHandle, { name: "home" } as FileSystemDirectoryHandle);
    expect(store.get(atom_homePinnedPaths)).toEqual([]);
    expect(store.get(atom_homePins)).toEqual({ "local:work": ["b.md"] });
  });

  it("does nothing without a vault", () => {
    const store = storeWithVault(null);
    store.set(atom_toggleHomePin, "a.md");
    expect(store.get(atom_homePins)).toEqual({});
  });

  it("unpins a deleted note, or every note under a deleted folder", () => {
    const store = storeWithVault("work");
    store.set(atom_homePins, { "local:work": ["notes/a.md", "notes-old.md", "notes/deep/b.md", "c.md"] });

    store.set(atom_forgetHomePins, "c.md");
    store.set(atom_forgetHomePins, "notes");
    expect(store.get(atom_homePinnedPaths)).toEqual(["notes-old.md"]);
  });
});
