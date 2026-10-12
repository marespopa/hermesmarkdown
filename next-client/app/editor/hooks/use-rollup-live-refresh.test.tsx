import React from "react";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_activeFilePath } from "@/app/atoms/file-atoms";
import { atom_indexerState, atom_rollupStatus } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import { announceNoteSaved } from "@/app/utils/note-events";
import { parseRollupName } from "@/app/utils/rollup/period";
import { feedsRollup, touchesRollupDone, useRollupLiveRefresh } from "./use-rollup-live-refresh";
import { extractTasks } from "@/app/utils/taskExtractor";

const refreshRollup = vi.fn();
vi.mock("./use-rollups", () => ({ useRollups: () => ({ refreshRollup }) }));

// The real atom reads the workspace layout; a plain path atom stands in.
vi.mock("@/app/atoms/file-atoms", async () => {
  const { atom } = await import("jotai");
  const path = atom<string | null>(null);
  return { atom_activeFilePath: atom((get) => get(path), (_get, set, value: string | null) => set(path, value)) };
});

const vault = {} as FileSystemDirectoryHandle;

function setup(enabled = true) {
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const hook = renderHook(({ on }) => useRollupLiveRefresh(on), { wrapper, initialProps: { on: enabled } });
  const open = (path: string | null) => act(() => store.set(atom_activeFilePath, path));
  // A vault opens and its first index run starts and finishes.
  const index = () => {
    act(() => { store.set(atom_vaultHandle, vault); store.set(atom_indexerState, "compiling"); });
    act(() => store.set(atom_indexerState, "idle"));
  };
  // Panes showing these files side by side.
  const show = (...paths: string[]) => act(() => store.set(atom_workspaceLayout, {
    rootContainer: {
      id: "root",
      direction: "horizontal",
      sizes: paths.map(() => 100 / paths.length),
      children: paths.map((path, i) => ({ id: `p${i}`, type: "editor" as const, openFilePaths: [path], activeFilePath: path, isPinned: false })),
    },
  }));
  return { store, open, index, show, ...hook };
}

describe("useRollupLiveRefresh", () => {
  beforeEach(() => {
    refreshRollup.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("refreshes a rollup sheet quietly when it becomes the active tab", () => {
    const { open, index } = setup();
    index();
    open("Journal/2026-W41.md");
    expect(refreshRollup).toHaveBeenCalledWith("Journal/2026-W41.md", { quiet: true });
  });

  it("covers every rollup level and leaves other notes alone", () => {
    const { open, index } = setup();
    index();
    for (const name of ["2026-10.md", "2026-Q4.md", "2026-year.md"]) open(name);
    open("2026-10-12.md");
    open("Release checklist.md");
    expect(refreshRollup.mock.calls.map(([path]) => path)).toEqual(["2026-10.md", "2026-Q4.md", "2026-year.md"]);
  });

  it("skips a sheet openRollup has just refreshed", () => {
    const { store, open, index } = setup();
    index();
    act(() => store.set(atom_rollupStatus, { "2026-W41.md": { at: Date.now(), fresh: [] } }));
    open("2026-W41.md");
    expect(refreshRollup).not.toHaveBeenCalled();
  });

  it("waits for the vault's first index run before refreshing a restored sheet", () => {
    const { store, open } = setup();
    open("2026-W41.md");
    act(() => store.set(atom_vaultHandle, vault));
    expect(refreshRollup).not.toHaveBeenCalled();
    act(() => store.set(atom_indexerState, { status: "compiling", count: 3 }));
    expect(refreshRollup).not.toHaveBeenCalled();
    act(() => store.set(atom_indexerState, "idle"));
    expect(refreshRollup).toHaveBeenCalledTimes(1);
  });

  it("refreshes once per activation, not on every reindex", () => {
    const { store, open, index } = setup();
    index();
    open("2026-W41.md");
    act(() => store.set(atom_indexerState, "compiling"));
    act(() => store.set(atom_indexerState, "idle"));
    expect(refreshRollup).toHaveBeenCalledTimes(1);
    open("2026-10-12.md");
    open("2026-W41.md");
    expect(refreshRollup).toHaveBeenCalledTimes(2);
  });

  it("refreshes the active sheet on returning to the window once it's 10s old", () => {
    const { store, open, index } = setup();
    index();
    open("2026-W41.md");
    act(() => store.set(atom_rollupStatus, { "2026-W41.md": { at: Date.now(), fresh: [] } }));
    refreshRollup.mockReset();
    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(refreshRollup).not.toHaveBeenCalled();
    vi.setSystemTime(Date.now() + 11_000);
    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(refreshRollup).toHaveBeenCalledWith("2026-W41.md", { quiet: true });
  });

  it("refreshes a showing rollup once after a burst of saves to one of its days", () => {
    const { index, show } = setup();
    index();
    show("2026-10-12.md", "2026-W42.md");
    refreshRollup.mockReset();
    act(() => { announceNoteSaved("2026-10-12.md"); announceNoteSaved("2026-10-12.md"); });
    expect(refreshRollup).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1_500); });
    expect(refreshRollup).toHaveBeenCalledTimes(1);
    expect(refreshRollup).toHaveBeenCalledWith("2026-W42.md", { quiet: true });
  });

  it("ignores saves outside a showing rollup's period", () => {
    const { index, show } = setup();
    index();
    show("2026-10-05.md", "2026-W42.md");
    refreshRollup.mockReset();
    act(() => { announceNoteSaved("2026-10-05.md"); vi.advanceTimersByTime(2_000); });
    expect(refreshRollup).not.toHaveBeenCalled();
  });

  it("does nothing while disabled", () => {
    const { open, index } = setup(false);
    index();
    open("2026-W41.md");
    expect(refreshRollup).not.toHaveBeenCalled();
  });
});

describe("feedsRollup", () => {
  const month = parseRollupName("2026-10.md")!;

  it("is true for a daily sheet in the period and a sheet one level down", () => {
    expect(feedsRollup("journal/2026-10-31.md", month)).toBe(true);
    expect(feedsRollup("journal/2026-W41.md", month)).toBe(true);
    expect(feedsRollup("2026-10.md", parseRollupName("2026-Q4.md")!)).toBe(true);
    expect(feedsRollup("2026-Q4.md", parseRollupName("2026-year.md")!)).toBe(true);
  });

  it("is false for other days, other levels and ordinary notes", () => {
    expect(feedsRollup("2026-11-01.md", month)).toBe(false);
    expect(feedsRollup("2026-W45.md", month)).toBe(false); // its Thursday is in November
    expect(feedsRollup("2026-Q4.md", month)).toBe(false);
    expect(feedsRollup("Pricing notes.md", month)).toBe(false);
  });
});

describe("touchesRollupDone", () => {
  const week = parseRollupName("2026-W42.md")!;

  it("is true for a note with a task done in the period, or one the rollup links", () => {
    const tasks = extractTasks("Roadmap.md", "- [x] Draft the Q4 plan @done(2026-10-14)");
    expect(touchesRollupDone("projects/Roadmap.md", tasks, week, "")).toBe(true);
    expect(touchesRollupDone("projects/Roadmap.md", [], week, "- Draft the Q4 plan · [[Roadmap]]")).toBe(true);
  });

  it("is false for a task done outside the period, in a note the rollup doesn't link", () => {
    const tasks = extractTasks("Roadmap.md", "- [x] Draft the Q4 plan @done(2026-10-02)");
    expect(touchesRollupDone("projects/Roadmap.md", tasks, week, "- Ship billing export · [[2026-10-13]]")).toBe(false);
  });
});
