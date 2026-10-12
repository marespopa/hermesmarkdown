import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SheetSkeleton, { SHEET_SKELETON_DELAY_MS } from "./SheetSkeleton";

describe("SheetSkeleton", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows nothing for a quick switch, then the outline", () => {
    render(<SheetSkeleton />);
    expect(screen.queryByRole("status", { name: "Opening sheet" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(SHEET_SKELETON_DELAY_MS));
    expect(screen.getByRole("status", { name: "Opening sheet" })).toBeInTheDocument();
  });

  it("shows at once with no delay", () => {
    render(<SheetSkeleton delay={0} />);
    expect(screen.getByRole("status", { name: "Opening sheet" })).toBeInTheDocument();
  });
});
