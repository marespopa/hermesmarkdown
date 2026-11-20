import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const showActionToast = vi.fn();
vi.mock("@/app/components/Toastr", () => ({ showActionToast: (...args: unknown[]) => showActionToast(...args) }));

import { STARTUP_STUCK_MS, useStartupWatchdog } from "./use-startup-watchdog";

describe("useStartupWatchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    showActionToast.mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("offers a reload when the skeleton lasts too long", () => {
    renderHook(() => useStartupWatchdog(true));
    vi.advanceTimersByTime(STARTUP_STUCK_MS - 1);
    expect(showActionToast).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(showActionToast).toHaveBeenCalledWith("Still opening your notes…", "Reload", expect.any(Function));
  });

  it("says nothing when the editor opens in time", () => {
    const { rerender } = renderHook(({ waiting }) => useStartupWatchdog(waiting), { initialProps: { waiting: true } });
    vi.advanceTimersByTime(STARTUP_STUCK_MS - 1000);
    rerender({ waiting: false });
    vi.advanceTimersByTime(STARTUP_STUCK_MS);
    expect(showActionToast).not.toHaveBeenCalled();
  });
});
