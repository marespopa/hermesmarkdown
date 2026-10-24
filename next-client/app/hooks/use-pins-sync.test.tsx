import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, Provider } from "jotai";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_pinsState } from "@/app/atoms/pin-atoms";
import { atom_fileSystemVersion, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { LEGACY_NOTE_PINS_KEY } from "./pins-migration";
import { usePinsSync } from "./use-pins-sync";

// Each fake vault's pins file (null: none), and a hook to hold a read open.
const disk = vi.hoisted(() => ({
  files: new Map<unknown, string | null>(),
  failWrite: false,
  hold: null as null | { vault: unknown; promise: Promise<void> },
}));

vi.mock("@/app/services/vault-pins", async () => {
  const yaml = await import("js-yaml");
  const format = await import("@/app/services/vault-pins-format");
  class PinsFileInvalidError extends Error {}
  class PinsFileNewerError extends Error {}
  return {
    PinsFileInvalidError,
    PinsFileNewerError,
    loadYaml: async () => ({ load: yaml.load, dump: yaml.dump }),
    readPinsFile: vi.fn(async (vault: unknown) => {
      if (disk.hold?.vault === vault) await disk.hold.promise;
      const text = disk.files.get(vault) ?? null;
      return text === null ? null : { text, handle: { name: "pins.yaml" } };
    }),
    updatePinsFile: vi.fn(async (vault: unknown, edit: (doc: never, pins: never) => unknown) => {
      const parsed = format.parsePins(disk.files.get(vault) ?? "", yaml.load);
      if (!parsed.ok) throw new PinsFileInvalidError();
      const next = edit(parsed.doc as never, parsed.pins as never) as ReturnType<typeof format.addPins>;
      if (!next) return { pins: parsed.pins, changed: false };
      if (disk.failWrite) throw new Error("disk full");
      disk.files.set(vault, format.serializePins(next, yaml.dump));
      return { pins: format.listedPins(next), changed: true };
    }),
  };
});

const observer = vi.hoisted(() => ({ onChange: null as null | (() => void), sync: vi.fn(), disconnect: vi.fn() }));
vi.mock("@/app/hooks/file-system/file-observer", () => ({
  createFileObserver: (onChange: () => void) => {
    observer.onChange = onChange;
    return { sync: observer.sync, disconnect: observer.disconnect };
  },
}));

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));

import { readPinsFile, updatePinsFile } from "@/app/services/vault-pins";

const notes = { name: "Notes" } as unknown as FileSystemDirectoryHandle;
const archive = { name: "Archive" } as unknown as FileSystemDirectoryHandle;

function Harness({ enabled }: { enabled: boolean }) {
  usePinsSync(enabled);
  return null;
}

const mount = (store: ReturnType<typeof createStore>, enabled = true) =>
  render(<Provider store={store}><Harness enabled={enabled} /></Provider>);

const targets = (store: ReturnType<typeof createStore>) => store.get(atom_pinsState).pins.map((pin) => pin.target);

describe("usePinsSync", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    disk.files.clear();
    disk.failWrite = false;
    disk.hold = null;
    observer.onChange = null;
    localStorage.clear();
    store = createStore();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("reads the pins when a vault opens", async () => {
    disk.files.set(notes, "pins:\n  - {tag: bug}\n  - {page: tasks}\n");
    store.set(atom_vaultHandle, notes);
    mount(store);
    await waitFor(() => expect(store.get(atom_pinsState).status).toBe("ok"));
    expect(store.get(atom_pinsState).vault).toBe(notes);
    expect(targets(store)).toEqual(["bug", "tasks"]);
  });

  it("has no pins without a file, or without a vault", async () => {
    store.set(atom_vaultHandle, notes);
    mount(store);
    await waitFor(() => expect(store.get(atom_pinsState)).toEqual({ vault: notes, status: "ok", pins: [] }));

    act(() => store.set(atom_vaultHandle, null));
    await waitFor(() => expect(store.get(atom_pinsState)).toEqual({ vault: null, status: "none", pins: [] }));
  });

  it("keeps the pins last read when the file turns invalid", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    disk.files.set(notes, "pins:\n  - {tag: bug}\n");
    store.set(atom_vaultHandle, notes);
    mount(store);
    await waitFor(() => expect(targets(store)).toEqual(["bug"]));

    disk.files.set(notes, "pins: [\n  {tag: bug\n");
    act(() => store.set(atom_fileSystemVersion, (v) => v + 1));
    await waitFor(() => expect(store.get(atom_pinsState).status).toBe("invalid"));
    expect(targets(store)).toEqual(["bug"]);
  });

  it("re-reads on a file system version bump and when the file's tab is saved", async () => {
    store.set(atom_vaultHandle, notes);
    mount(store);
    await waitFor(() => expect(store.get(atom_pinsState).status).toBe("ok"));

    disk.files.set(notes, "pins:\n  - {tag: release}\n");
    act(() => store.set(atom_fileSystemVersion, (v) => v + 1));
    await waitFor(() => expect(targets(store)).toEqual(["release"]));

    disk.files.set(notes, "pins:\n  - {tag: release}\n  - {tag: bug}\n");
    act(() => store.set(atom_openFiles, {
      ".hermes/pins.yaml": { content: "saved", lastSavedContent: "saved", fileName: "pins.yaml", activeFilePath: ".hermes/pins.yaml" },
    }));
    await waitFor(() => expect(targets(store)).toEqual(["release", "bug"]));
    expect(observer.sync).toHaveBeenCalledWith(new Map([[".hermes/pins.yaml", { name: "pins.yaml" }]]));
  });

  it("re-reads 250 ms after the file observer reports a change", async () => {
    store.set(atom_vaultHandle, notes);
    mount(store);
    await waitFor(() => expect(store.get(atom_pinsState).status).toBe("ok"));
    const reads = vi.mocked(readPinsFile).mock.calls.length;

    vi.useFakeTimers();
    disk.files.set(notes, "pins:\n  - {folder: projects}\n");
    observer.onChange!();
    await act(async () => { vi.advanceTimersByTime(249); });
    expect(vi.mocked(readPinsFile).mock.calls.length).toBe(reads);
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(vi.mocked(readPinsFile).mock.calls.length).toBe(reads + 1);
    vi.useRealTimers();
    await waitFor(() => expect(targets(store)).toEqual(["projects"]));
  });

  it("resets on a vault change and drops a late read from the previous vault", async () => {
    let release: () => void = () => {};
    disk.hold = { vault: notes, promise: new Promise((resolve) => { release = resolve; }) };
    disk.files.set(notes, "pins:\n  - {tag: bug}\n");
    disk.files.set(archive, "pins:\n  - {page: trash}\n");
    store.set(atom_vaultHandle, notes);
    mount(store);
    expect(store.get(atom_pinsState)).toEqual({ vault: notes, status: "loading", pins: [] });

    act(() => store.set(atom_vaultHandle, archive));
    await waitFor(() => expect(targets(store)).toEqual(["trash"]));
    expect(observer.disconnect).toHaveBeenCalled();

    await act(async () => { release(); });
    expect(store.get(atom_pinsState)).toMatchObject({ vault: archive, pins: [{ target: "trash" }] });
  });

  it("does nothing while disabled", async () => {
    disk.files.set(notes, "pins:\n  - {tag: bug}\n");
    store.set(atom_vaultHandle, notes);
    mount(store, false);
    await act(async () => {});
    expect(readPinsFile).not.toHaveBeenCalled();
    expect(store.get(atom_pinsState).status).toBe("none");
  });

  describe("migration of per-device pinned notes", () => {
    const seed = (value: Record<string, string[]>) => localStorage.setItem(LEGACY_NOTE_PINS_KEY, JSON.stringify(value));
    const legacy = () => {
      const raw = localStorage.getItem(LEGACY_NOTE_PINS_KEY);
      return raw ? JSON.parse(raw) : null;
    };

    it("appends the vault's legacy notes in order, skipping pinned ones, and forgets them", async () => {
      seed({ "local:Notes": ["projects/roadmap.md", "inbox.md", "bug.md"], "local:Archive": ["old.md"] });
      disk.files.set(notes, "pins:\n  - {note: inbox.md}\n");
      store.set(atom_vaultHandle, notes);
      mount(store);

      await waitFor(() => expect(targets(store)).toEqual(["inbox.md", "projects/roadmap.md", "bug.md"]));
      expect(updatePinsFile).toHaveBeenCalledTimes(1);
      expect(legacy()).toEqual({ "local:Archive": ["old.md"] });
    });

    it("removes the storage key once it's empty", async () => {
      seed({ "local:Notes": ["inbox.md"] });
      store.set(atom_vaultHandle, notes);
      mount(store);
      await waitFor(() => expect(targets(store)).toEqual(["inbox.md"]));
      expect(localStorage.getItem(LEGACY_NOTE_PINS_KEY)).toBeNull();
    });

    it("doesn't migrate into an invalid file", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      seed({ "local:Notes": ["inbox.md"] });
      disk.files.set(notes, "pins: [\n");
      store.set(atom_vaultHandle, notes);
      mount(store);
      await waitFor(() => expect(store.get(atom_pinsState).status).toBe("invalid"));
      expect(updatePinsFile).not.toHaveBeenCalled();
      expect(legacy()).toEqual({ "local:Notes": ["inbox.md"] });
    });

    it("keeps the legacy entry when the write fails", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      seed({ "local:Notes": ["inbox.md"] });
      disk.failWrite = true;
      store.set(atom_vaultHandle, notes);
      mount(store);
      await waitFor(() => expect(updatePinsFile).toHaveBeenCalledTimes(1));
      await act(async () => {});
      expect(legacy()).toEqual({ "local:Notes": ["inbox.md"] });
    });

    it("runs once per vault per session", async () => {
      seed({ "local:Notes": ["inbox.md"] });
      store.set(atom_vaultHandle, notes);
      mount(store);
      await waitFor(() => expect(targets(store)).toEqual(["inbox.md"]));

      seed({ "local:Notes": ["bug.md"] });
      act(() => store.set(atom_fileSystemVersion, (v) => v + 1));
      await act(async () => {});
      await waitFor(() => expect(vi.mocked(readPinsFile).mock.calls.length).toBeGreaterThan(1));
      expect(updatePinsFile).toHaveBeenCalledTimes(1);
      expect(targets(store)).toEqual(["inbox.md"]);
    });
  });
});
