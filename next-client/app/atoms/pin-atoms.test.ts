import { createStore } from "jotai";
import { beforeEach, describe, expect, it } from "vitest";
import { movePin, pinKey, type Pin } from "@/app/services/pins-model";
import {
  atom_forgetPins,
  atom_pinnedNotePaths,
  atom_pins,
  atom_pinsByVault,
  atom_pinsVaultKey,
  atom_remapPins,
  atom_updatePins,
  PINS_STORAGE_KEY,
} from "./pin-atoms";
import { seedPins } from "./pin-atoms.test-utils";

const note = (target: string, icon: string | null = null): Pin => ({ kind: "note", target, icon });
const tag = (target: string): Pin => ({ kind: "tag", target, icon: null });
const stored = () => JSON.parse(localStorage.getItem(PINS_STORAGE_KEY) || "{}");

describe("pin atoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    localStorage.clear();
    store = createStore();
  });

  it("shows and saves an edit at once, for the open vault only", async () => {
    const pins = [note("a.md"), tag("release"), note("b.md", "🚀")];
    seedPins(store, pins);
    expect(await store.set(atom_updatePins, (doc) => movePin(doc, pinKey(pins[2]), 0, pins.map(pinKey)))).toBe("ok");
    expect(store.get(atom_pins)).toEqual([note("b.md", "🚀"), note("a.md"), tag("release")]);
    expect(stored()["local:Notes"]).toEqual([
      { kind: "note", target: "b.md", icon: "🚀" },
      { kind: "note", target: "a.md", icon: null },
      { kind: "tag", target: "release", icon: null },
    ]);

    store.set(atom_pinsVaultKey, "local:Archive");
    expect(store.get(atom_pins)).toEqual([]);
  });

  it("reports an edit that changes nothing, and does nothing without a vault", async () => {
    seedPins(store, [tag("release")]);
    expect(await store.set(atom_updatePins, () => null)).toBe("unchanged");
    store.set(atom_pinsVaultKey, null);
    expect(await store.set(atom_updatePins, () => ({ items: [] }))).toBe("no-vault");
  });

  it("drops anything odd in storage", () => {
    // Seeded through the store: the storage atom reads localStorage when the module loads.
    store.set(atom_pinsByVault, { "local:Notes": [{ kind: "tag", target: "bug" }, { kind: "widget" }, null, "x"] } as never);
    store.set(atom_pinsVaultKey, "local:Notes");
    expect(store.get(atom_pins)).toEqual([tag("bug")]);
  });

  it("lists pinned note paths in pin order, the same array while they're unchanged", async () => {
    seedPins(store, [note("b.md"), tag("release"), note("a.md")]);
    const paths = store.get(atom_pinnedNotePaths);
    expect(paths).toEqual(["b.md", "a.md"]);
    seedPins(store, [note("b.md", "🚀"), tag("release"), note("a.md")]);
    expect(store.get(atom_pinnedNotePaths)).toBe(paths);
  });

  it("remaps and forgets only when a pin is affected", async () => {
    seedPins(store, [note("notes/idea.md"), tag("notes")]);
    const before = store.get(atom_pins);

    await store.set(atom_remapPins, { oldPath: "inbox", newPath: "archive" });
    await store.set(atom_forgetPins, "notes-old.md");
    expect(store.get(atom_pins)).toBe(before);

    await store.set(atom_remapPins, { oldPath: "notes", newPath: "archive" });
    expect(store.get(atom_pins)).toEqual([note("archive/idea.md"), tag("notes")]);
    await store.set(atom_forgetPins, "archive");
    expect(store.get(atom_pins)).toEqual([tag("notes")]);
  });
});
