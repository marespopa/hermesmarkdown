import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import useVisibleViewport from "./use-visible-viewport";

function stubViewport(height: number, offsetTop = 0) {
  const target = new EventTarget();
  const vv = Object.assign(target, { height, offsetTop });
  vi.stubGlobal("visualViewport", vv);
  vi.stubGlobal("innerHeight", 800);
  return vv;
}

describe("useVisibleViewport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("leaves the layer alone while the keyboard is closed", () => {
    stubViewport(800);
    const { result } = renderHook(() => useVisibleViewport());
    expect(result.current).toBeUndefined();
  });

  it("pins the layer to the visible area once the keyboard opens and the page pans", () => {
    const vv = stubViewport(800);
    const { result } = renderHook(() => useVisibleViewport());

    act(() => {
      Object.assign(vv, { height: 450, offsetTop: 120 });
      vv.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toEqual({ top: 120, bottom: "auto", height: 450 });

    act(() => {
      Object.assign(vv, { height: 800, offsetTop: 0 });
      vv.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBeUndefined();
  });
});
