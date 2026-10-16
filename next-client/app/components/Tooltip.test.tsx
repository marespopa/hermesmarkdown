import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Tooltip from "./Tooltip";

describe("Tooltip portal mode", () => {
  afterEach(() => vi.useRealTimers());

  it("renders the label into document.body after the hover delay and hides on leave", () => {
    vi.useFakeTimers();
    const { container } = render(
      <div style={{ overflow: "hidden" }}>
        <Tooltip label="Close tab" portal>
          <span>x</span>
        </Tooltip>
      </div>,
    );
    const trigger = screen.getByText("x").parentElement!;

    fireEvent.mouseEnter(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();

    act(() => vi.advanceTimersByTime(400));
    const bubble = screen.getByRole("tooltip");
    expect(bubble.textContent).toBe("Close tab");
    expect(container.contains(bubble)).toBe(false);

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("stays hidden on touch screens, where a tap emulates mouseenter", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(hover: none)" }));
    render(
      <Tooltip label="Close tab" portal>
        <span>x</span>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText("x").parentElement!);
    act(() => vi.advanceTimersByTime(400));
    expect(screen.queryByRole("tooltip")).toBeNull();
    vi.unstubAllGlobals();
  });
});
