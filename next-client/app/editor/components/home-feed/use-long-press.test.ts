import type React from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LONG_PRESS_MS, useLongPress } from "./use-long-press";

const touch = (x: number, y: number, count = 1) =>
  ({ touches: Array.from({ length: count }, () => ({ clientX: x, clientY: y })) }) as unknown as React.TouchEvent;

describe("useLongPress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires at the touch point after a hold, and skips the click that follows once", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.handlers.onTouchStart(touch(20, 30)));
    act(() => { vi.advanceTimersByTime(LONG_PRESS_MS); });
    expect(onLongPress).toHaveBeenCalledWith({ x: 20, y: 30 });
    expect(result.current.shouldSkipClick()).toBe(true);
    expect(result.current.shouldSkipClick()).toBe(false);
  });

  it("doesn't fire for a tap, a scroll or a two-finger touch", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.handlers.onTouchStart(touch(0, 0)));
    act(() => result.current.handlers.onTouchEnd());
    act(() => result.current.handlers.onTouchStart(touch(0, 0)));
    act(() => result.current.handlers.onTouchMove(touch(0, 40)));
    act(() => result.current.handlers.onTouchStart(touch(0, 0, 2)));
    act(() => { vi.advanceTimersByTime(LONG_PRESS_MS * 2); });

    expect(onLongPress).not.toHaveBeenCalled();
    expect(result.current.shouldSkipClick()).toBe(false);
  });
});
