import { createStore } from "jotai";
import { beforeEach, describe, expect, it } from "vitest";
import { atom_forgetNotePins, atom_pinnedNotePaths, atom_toggleNotePin } from "./note-pin-atoms";
import { atom_notePins } from "./ui-atoms";
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
    store.set(atom_toggleNotePin, "a.md");
    store.set(atom_toggleNotePin, "b.md");
    expect(store.get(atom_pinnedNotePaths)).toEqual(["b.md", "a.md"]);

    store.set(atom_toggleNotePin, "a.md");
    expect(store.get(atom_pinnedNotePaths)).toEqual(["b.md"]);

    store.set(atom_vaultHandle, { name: "home" } as FileSystemDirectoryHandle);
    expect(store.get(atom_pinnedNotePaths)).toEqual([]);
    expect(store.get(atom_notePins)).toEqual({ "local:work": ["b.md"] });
  });

  it("does nothing without a vault", () => {
    const store = storeWithVault(null);
    store.set(atom_toggleNotePin, "a.md");
    expect(store.get(atom_notePins)).toEqual({});
  });

  it("unpins a deleted note, or every note under a deleted folder", () => {
    const store = storeWithVault("work");
    store.set(atom_notePins, { "local:work": ["notes/a.md", "notes-old.md", "notes/deep/b.md", "c.md"] });

    store.set(atom_forgetNotePins, "c.md");
    store.set(atom_forgetNotePins, "notes");
    expect(store.get(atom_pinnedNotePaths)).toEqual(["notes-old.md"]);
  });
});
