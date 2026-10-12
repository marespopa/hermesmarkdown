import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { atom_fileMetadata, type FileMetadata } from "@/app/atoms/metadata";
import { todayNoteName } from "@/app/utils/today-note";
import { parseSheetName } from "@/app/utils/sheet-nav";
import SheetSwitcher from "./SheetSwitcher";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const openTodayNote = vi.fn<(date?: Date) => Promise<void>>(async () => {});
vi.mock("@/app/hooks/use-file-system", () => ({ useFileSystem: () => ({ openTodayNote }) }));
const openPeriodSheet = vi.fn<(...args: unknown[]) => Promise<void>>(async () => {});
vi.mock("../hooks/use-period-sheets", () => ({ usePeriodSheets: () => ({ openPeriodSheet }) }));

function renderSheet(name: string, dailySheets: string[] = [], onPendingChange?: (level: string | null) => void) {
  const store = createStore();
  const metadata: Record<string, FileMetadata> = {};
  for (const date of dailySheets) {
    const path = `journal/${date}.md`;
    metadata[path] = { path, name: `${date}.md`, frontmatter: {}, tasks: [] } as unknown as FileMetadata;
  }
  store.set(atom_fileMetadata, metadata);
  render(
    <Provider store={store}>
      <SheetSwitcher sheet={parseSheetName(name)!} onPendingChange={onPendingChange} />
    </Provider>,
  );
}

describe("SheetSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Saturday, October 11, 2026.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 11, 15, 30));
  });
  afterEach(() => vi.useRealTimers());

  it("marks the sheet's level and today's sheet", () => {
    renderSheet("2026-10-11.md");
    expect(screen.getByRole("button", { name: "Day" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/today/)).toBeInTheDocument();
  });

  it("offers Quarter and Year only once the vault has such a sheet, or one is open", () => {
    renderSheet("2026-10-11.md", ["2026-10-11"]);
    const levels = () => screen.getAllByRole("button").map((b) => b.textContent).filter((t) => /^(Day|Week|Month|Quarter|Year)$/.test(t ?? ""));
    expect(levels()).toEqual(["Day", "Week", "Month"]);
  });

  it("shows Quarter on a quarterly sheet and Year once a yearly sheet exists", () => {
    renderSheet("2026-Q4.md", ["2026-10-11", "2025-year"]);
    expect(screen.getByRole("button", { name: "Quarter" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Year" })).toBeInTheDocument();
  });

  it("goes up from a day to its week and month", () => {
    renderSheet("2026-10-06.md", ["2026-10-06"]);
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(openPeriodSheet).toHaveBeenCalledWith({ kind: "week", offset: 0 }, expect.any(Date));
    const [, date] = openPeriodSheet.mock.calls[0] as unknown as [unknown, Date];
    expect(todayNoteName(date)).toBe("2026-10-06");
  });

  it("steps to the previous day with a sheet and disables the future", () => {
    renderSheet("2026-10-11.md", ["2026-10-02", "2026-10-11"]);
    expect(screen.getByRole("button", { name: "Next day" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(todayNoteName(openTodayNote.mock.calls[0][0]!)).toBe("2026-10-02");
  });

  it("disables Day on a past week with no daily sheets", () => {
    renderSheet("2026-W38.md");
    expect(screen.getByRole("button", { name: "Day" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Month" })).toBeEnabled();
  });

  it("marks the tapped level at once and reports it until the sheet is open", async () => {
    let finish!: () => void;
    openPeriodSheet.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const onPendingChange = vi.fn();
    renderSheet("2026-10-11.md", ["2026-10-11"], onPendingChange);

    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(onPendingChange).toHaveBeenLastCalledWith("month");
    expect(screen.getByRole("navigation", { name: "Worklog sheets" })).toHaveAttribute("aria-busy", "true");
    // A second tap while it opens does nothing.
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(openPeriodSheet).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    expect(onPendingChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("navigation", { name: "Worklog sheets" })).not.toHaveAttribute("aria-busy");
  });

  it("lets go of the pending level when opening fails", async () => {
    openPeriodSheet.mockRejectedValueOnce(new Error("unreadable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const onPendingChange = vi.fn();
    renderSheet("2026-10-11.md", ["2026-10-11"], onPendingChange);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Month" }));
    });
    expect(onPendingChange).toHaveBeenLastCalledWith(null);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
