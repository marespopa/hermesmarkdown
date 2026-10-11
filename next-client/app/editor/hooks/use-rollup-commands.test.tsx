import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_openFiles } from "@/app/atoms/file-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { useRollupCommands } from "./use-rollup-commands";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Every useRegisterCommand call, in order; the hook makes nine per render.
const calls: (Command | null)[] = [];
vi.mock("@/app/components/CommandPalette/CommandPaletteContext", () => ({
  useRegisterCommand: (command: Command | null) => { calls.push(command); },
}));
const openRollup = vi.fn(async () => {});
const refreshRollup = vi.fn(async () => {});
vi.mock("./use-rollups", () => ({ useRollups: () => ({ openRollup, refreshRollup }) }));

const latest = () => calls.slice(-9).filter((command): command is Command => command !== null);
const byId = (id: string) => latest().find((command) => command.id === id);

function setActivePath(store: ReturnType<typeof createStore>, path: string | null) {
  if (!path) {
    store.set(atom_workspaceLayout, {
      rootContainer: { id: "default-pane", type: "editor", openFilePaths: ["draft"], activeFilePath: "draft", isPinned: false },
    });
    return;
  }
  store.set(atom_openFiles, (prev) => ({
    ...prev,
    [path]: { content: "", lastSavedContent: "", fileName: path.split("/").pop()!, activeFilePath: path },
  }));
  store.set(atom_workspaceLayout, {
    rootContainer: { id: "default-pane", type: "editor", openFilePaths: [path], activeFilePath: path, isPinned: false },
  });
}

function setup(options: { disabledReason?: string } = {}) {
  const store = createStore();
  const beforeOpen = vi.fn(async () => {});
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  renderHook(() => useRollupCommands({ ...options, beforeOpen }), { wrapper });
  return { store, beforeOpen };
}

describe("useRollupCommands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    localStorage.clear();
  });

  it("registers the eight period commands, disabled with the given reason", () => {
    setup({ disabledReason: "Open a vault first" });
    const ids = [
      "open-this-week-sheet", "open-last-week-sheet", "open-this-month-sheet", "open-last-month-sheet",
      "open-this-quarter-sheet", "open-last-quarter-sheet", "open-this-year-sheet", "open-last-year-sheet",
    ];
    expect(latest().map((command) => command.id)).toEqual(ids);
    expect(latest().map((command) => command.label)).toEqual([
      "This week's sheet", "Last week's sheet", "This month's sheet", "Last month's sheet",
      "This quarter's sheet", "Last quarter's sheet", "This year's sheet", "Last year's sheet",
    ]);
    for (const command of latest()) {
      expect(command.disabledReason).toBe("Open a vault first");
      expect(command.category).toBe("Navigation");
    }
  });

  it("runs beforeOpen, then opens the right period", async () => {
    const { beforeOpen } = setup();
    expect(byId("open-this-week-sheet")?.disabledReason).toBeUndefined();
    const targets = {
      "open-this-week-sheet": { kind: "week", offset: 0 },
      "open-last-week-sheet": { kind: "week", offset: -1 },
      "open-this-month-sheet": { kind: "month", offset: 0 },
      "open-last-month-sheet": { kind: "month", offset: -1 },
      "open-this-quarter-sheet": { kind: "quarter", offset: 0 },
      "open-last-quarter-sheet": { kind: "quarter", offset: -1 },
      "open-this-year-sheet": { kind: "year", offset: 0 },
      "open-last-year-sheet": { kind: "year", offset: -1 },
    };
    for (const [id, target] of Object.entries(targets)) {
      openRollup.mockClear();
      beforeOpen.mockClear();
      await act(async () => { await byId(id)!.action(); });
      expect(beforeOpen).toHaveBeenCalledTimes(1);
      expect(openRollup).toHaveBeenCalledWith(target);
      expect(beforeOpen.mock.invocationCallOrder[0]).toBeLessThan(openRollup.mock.invocationCallOrder[0]);
    }
  });

  it("offers Refresh rollup only while a weekly or monthly sheet is active", async () => {
    const { store } = setup();
    expect(byId("refresh-rollup")).toBeUndefined();

    act(() => setActivePath(store, "journal/2026/10/2026-W41.md"));
    const refresh = byId("refresh-rollup");
    expect(refresh).toMatchObject({ label: "Refresh rollup", category: "Document" });
    await act(async () => { await refresh!.action(); });
    expect(refreshRollup).toHaveBeenCalledWith("journal/2026/10/2026-W41.md");

    act(() => setActivePath(store, "journal/2026-10.md"));
    expect(byId("refresh-rollup")).toBeDefined();

    act(() => setActivePath(store, "journal/2026/10/2026-10-09.md"));
    expect(byId("refresh-rollup")).toBeUndefined();

    act(() => setActivePath(store, "notes.md"));
    expect(byId("refresh-rollup")).toBeUndefined();
  });
});
