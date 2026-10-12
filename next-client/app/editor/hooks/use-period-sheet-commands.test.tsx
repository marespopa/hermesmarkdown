import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { usePeriodSheetCommands } from "./use-period-sheet-commands";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Every useRegisterCommand call, in order; the hook makes eight per render.
const calls: (Command | null)[] = [];
vi.mock("@/app/components/CommandPalette/CommandPaletteContext", () => ({
  useRegisterCommand: (command: Command | null) => { calls.push(command); },
}));
const openPeriodSheet = vi.fn(async () => {});
vi.mock("./use-period-sheets", () => ({ usePeriodSheets: () => ({ openPeriodSheet }) }));

const latest = () => calls.slice(-8).filter((command): command is Command => command !== null);
const byId = (id: string) => latest().find((command) => command.id === id);

function setup(options: { disabledReason?: string } = {}) {
  const store = createStore();
  const beforeOpen = vi.fn(async () => {});
  const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  renderHook(() => usePeriodSheetCommands({ ...options, beforeOpen }), { wrapper });
  return { store, beforeOpen };
}

describe("usePeriodSheetCommands", () => {
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
      openPeriodSheet.mockClear();
      beforeOpen.mockClear();
      await act(async () => { await byId(id)!.action(); });
      expect(beforeOpen).toHaveBeenCalledTimes(1);
      expect(openPeriodSheet).toHaveBeenCalledWith(target);
      expect(beforeOpen.mock.invocationCallOrder[0]).toBeLessThan(openPeriodSheet.mock.invocationCallOrder[0]);
    }
  });
});
