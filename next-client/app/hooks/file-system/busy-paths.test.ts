import { createStore } from "jotai";
import { describe, expect, it } from "vitest";
import { atom_busyPaths, busyEntry } from "@/app/atoms/busy-path-atoms";
import { withBusyPaths } from "./busy-paths";

describe("busyEntry", () => {
  const busy = new Map([
    ["Projects", { op: "move" as const }],
    ["note.md", { op: "rename" as const, newName: "plan.md" }],
    ["Drafts", { op: "rename" as const, newName: "Ideas" }],
  ]);

  it("finds a path's own entry, and a busy folder's for what is inside it", () => {
    expect(busyEntry(busy, "note.md")).toEqual({ op: "rename", newName: "plan.md" });
    expect(busyEntry(busy, "Projects/roadmap.md")?.op).toBe("move");
    expect(busyEntry(busy, "Projects")?.op).toBe("move");
  });

  it("gives what is inside a renamed folder no new name of its own", () => {
    expect(busyEntry(busy, "Drafts")).toEqual({ op: "rename", newName: "Ideas" });
    expect(busyEntry(busy, "Drafts/outline.md")).toEqual({ op: "rename" });
  });

  it("leaves other paths, and names that only start the same, alone", () => {
    expect(busyEntry(busy, "Projects archive/roadmap.md")).toBeUndefined();
    expect(busyEntry(busy, "other.md")).toBeUndefined();
  });
});

describe("withBusyPaths", () => {
  it("marks the paths while the work runs and clears them after", async () => {
    const store = createStore();
    let seen: ReadonlyMap<string, unknown> | undefined;
    const result = await withBusyPaths(store, [["note.md", { op: "trash" }]], async () => {
      seen = store.get(atom_busyPaths);
      return "done";
    });
    expect(result).toBe("done");
    expect(seen?.has("note.md")).toBe(true);
    expect(store.get(atom_busyPaths).size).toBe(0);
  });

  it("clears them when the work fails", async () => {
    const store = createStore();
    await expect(withBusyPaths(store, [["note.md", { op: "move" }]], async () => {
      throw new Error("locked");
    })).rejects.toThrow("locked");
    expect(store.get(atom_busyPaths).size).toBe(0);
  });

  it("keeps other operations' paths", async () => {
    const store = createStore();
    await withBusyPaths(store, [["a.md", { op: "move" }]], () =>
      withBusyPaths(store, [["b.md", { op: "move" }]], async () => {
        expect([...store.get(atom_busyPaths).keys()]).toEqual(["a.md", "b.md"]);
      }));
    expect(store.get(atom_busyPaths).size).toBe(0);
  });
});
