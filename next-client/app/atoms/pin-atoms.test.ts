import { createStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { movePin, pinKey, type Pin } from "@/app/services/vault-pins-format";

const service = vi.hoisted(() => {
  class PinsFileInvalidError extends Error {}
  class PinsFileNewerError extends Error {}
  return { updatePinsFile: vi.fn(), PinsFileInvalidError, PinsFileNewerError };
});
vi.mock("@/app/services/vault-pins", () => service);

const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: toast }));

import {
  atom_forgetPins,
  atom_pinnedNotePaths,
  atom_pinsState,
  atom_remapPins,
  atom_updatePins,
  PINS_INVALID_MESSAGE,
  PINS_NEWER_MESSAGE,
  pinsWritePending,
} from "./pin-atoms";

const vault = { name: "Notes" } as unknown as FileSystemDirectoryHandle;
const other = { name: "Archive" } as unknown as FileSystemDirectoryHandle;
const note = (target: string, icon: string | null = null): Pin => ({ kind: "note", target, icon });
const tag = (target: string): Pin => ({ kind: "tag", target, icon: null });
const noEdit = () => null;

describe("pin atoms", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
  });

  it("shows the written pins after a write", async () => {
    store.set(atom_pinsState, { vault, status: "ok", pins: [] });
    service.updatePinsFile.mockResolvedValue({ pins: [tag("release")], changed: true });
    expect(await store.set(atom_updatePins, noEdit)).toBe("ok");
    expect(service.updatePinsFile).toHaveBeenCalledWith(vault, noEdit);
    expect(store.get(atom_pinsState)).toEqual({ vault, status: "ok", pins: [tag("release")] });
  });

  it("reports an unchanged write", async () => {
    store.set(atom_pinsState, { vault, status: "ok", pins: [tag("release")] });
    service.updatePinsFile.mockResolvedValue({ pins: [tag("release")], changed: false });
    expect(await store.set(atom_updatePins, noEdit)).toBe("unchanged");
  });

  it("does nothing without a vault", async () => {
    expect(await store.set(atom_updatePins, noEdit)).toBe("no-vault");
    expect(service.updatePinsFile).not.toHaveBeenCalled();
  });

  it("toasts and keeps the pins when the file is invalid or newer", async () => {
    store.set(atom_pinsState, { vault, status: "ok", pins: [tag("release")] });
    service.updatePinsFile.mockRejectedValueOnce(new service.PinsFileInvalidError());
    expect(await store.set(atom_updatePins, noEdit)).toBe("invalid");
    expect(toast.error).toHaveBeenCalledWith(PINS_INVALID_MESSAGE);
    expect(PINS_INVALID_MESSAGE).toBe("“.hermesmarkdown/pins.yaml” isn't valid YAML. Fix it, then try again.");
    expect(store.get(atom_pinsState)).toEqual({ vault, status: "invalid", pins: [tag("release")] });

    service.updatePinsFile.mockRejectedValueOnce(new service.PinsFileNewerError());
    expect(await store.set(atom_updatePins, noEdit)).toBe("newer");
    expect(toast.error).toHaveBeenCalledWith(PINS_NEWER_MESSAGE);
  });

  it("toasts a failed write", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    store.set(atom_pinsState, { vault, status: "ok", pins: [] });
    service.updatePinsFile.mockRejectedValueOnce(new Error("disk full"));
    expect(await store.set(atom_updatePins, noEdit)).toBe("error");
    expect(toast.error).toHaveBeenCalledWith("Couldn't save pins");
  });

  it("doesn't apply the result once the vault changed", async () => {
    store.set(atom_pinsState, { vault, status: "ok", pins: [] });
    let finish: (value: unknown) => void = () => {};
    service.updatePinsFile.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const write = store.set(atom_updatePins, noEdit);
    store.set(atom_pinsState, { vault: other, status: "loading", pins: [] });
    finish({ pins: [tag("release")], changed: true });
    expect(await write).toBe("ok");
    expect(store.get(atom_pinsState)).toEqual({ vault: other, status: "loading", pins: [] });
  });

  it("shows an edit at once, then the pins the file was written with", async () => {
    const pins = [note("a.md"), tag("release"), note("b.md", "🚀")];
    store.set(atom_pinsState, { vault, status: "ok", pins });
    let finish: (value: unknown) => void = () => {};
    service.updatePinsFile.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const write = store.set(atom_updatePins, (doc) => movePin(doc, pinKey(pins[2]), 0, pins.map(pinKey)));
    expect(store.get(atom_pinsState).pins).toEqual([note("b.md", "🚀"), note("a.md"), tag("release")]);
    expect(pinsWritePending()).toBe(true);
    finish({ pins: [note("b.md", "🚀"), tag("release"), note("a.md")], changed: true });
    expect(await write).toBe("ok");
    expect(pinsWritePending()).toBe(false);
    expect(store.get(atom_pinsState).pins).toEqual([note("b.md", "🚀"), tag("release"), note("a.md")]);
  });

  it("puts the pins back when the write fails", async () => {
    const pins = [note("a.md"), note("b.md")];
    store.set(atom_pinsState, { vault, status: "ok", pins });
    service.updatePinsFile.mockRejectedValue(new Error("disk"));
    const write = store.set(atom_updatePins, (doc) => movePin(doc, "note:b.md", 0, pins.map(pinKey)));
    expect(store.get(atom_pinsState).pins).toEqual([note("b.md"), note("a.md")]);
    expect(await write).toBe("error");
    expect(store.get(atom_pinsState)).toEqual({ vault, status: "ok", pins });
  });

  it("lists pinned note paths in file order, the same array while they're unchanged", () => {
    store.set(atom_pinsState, { vault, status: "ok", pins: [note("b.md"), tag("release"), note("a.md")] });
    const paths = store.get(atom_pinnedNotePaths);
    expect(paths).toEqual(["b.md", "a.md"]);
    store.set(atom_pinsState, { vault, status: "ok", pins: [note("b.md", "🚀"), tag("release"), note("a.md")] });
    expect(store.get(atom_pinnedNotePaths)).toBe(paths);
  });

  it("remaps and forgets only when a pin is affected", async () => {
    store.set(atom_pinsState, { vault, status: "ok", pins: [note("notes/idea.md"), tag("notes")] });
    service.updatePinsFile.mockResolvedValue({ pins: [], changed: true });

    await store.set(atom_remapPins, { oldPath: "inbox", newPath: "archive" });
    await store.set(atom_forgetPins, "notes-old.md");
    expect(service.updatePinsFile).not.toHaveBeenCalled();

    await store.set(atom_remapPins, { oldPath: "notes", newPath: "archive" });
    expect(service.updatePinsFile).toHaveBeenCalledTimes(1);
    store.set(atom_pinsState, { vault, status: "ok", pins: [note("notes/idea.md")] });
    await store.set(atom_forgetPins, "notes");
    expect(service.updatePinsFile).toHaveBeenCalledTimes(2);
  });
});
