import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStore, Provider } from "jotai";
import React from "react";
import { atom_boardViewports } from "@/app/atoms/board-atoms";
import { useBoardViewport } from "./use-board-viewport";

const wrap = (store = createStore()) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store }, children);
  return Wrapper;
};

describe("useBoardViewport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("saves the viewport per path in sessionStorage after 300 ms", () => {
    const { result } = renderHook(() => useBoardViewport("a.board.md"), { wrapper: wrap() });
    expect(result.current.initial).toBeNull();
    act(() => result.current.report({ scrollX: 10, scrollY: 20, zoom: { value: 1.5 } }));
    act(() => vi.advanceTimersByTime(299));
    expect(sessionStorage.getItem("hermes_board_viewport")).toBeNull();
    act(() => vi.advanceTimersByTime(2));
    expect(JSON.parse(sessionStorage.getItem("hermes_board_viewport")!)).toEqual({
      "a.board.md": { scrollX: 10, scrollY: 20, zoom: 1.5 },
    });
  });

  it("reads the saved viewport back as initial", () => {
    const store = createStore();
    store.set(atom_boardViewports, { "a.board.md": { scrollX: 1, scrollY: 2, zoom: 3 } });
    const { result } = renderHook(() => useBoardViewport("a.board.md"), { wrapper: wrap(store) });
    expect(result.current.initial).toEqual({ scrollX: 1, scrollY: 2, zoom: 3 });
  });

  it("doesn't save an unchanged viewport", () => {
    const store = createStore();
    store.set(atom_boardViewports, { "a.board.md": { scrollX: 1, scrollY: 2, zoom: 3 } });
    const { result } = renderHook(() => useBoardViewport("a.board.md"), { wrapper: wrap(store) });
    act(() => result.current.report({ scrollX: 1, scrollY: 2, zoom: { value: 3 } }));
    act(() => vi.advanceTimersByTime(500));
    expect(JSON.parse(sessionStorage.getItem("hermes_board_viewport")!)).toEqual({ "a.board.md": { scrollX: 1, scrollY: 2, zoom: 3 } });
  });

  it("commits a waiting viewport on unmount", () => {
    const { result, unmount } = renderHook(() => useBoardViewport("b.board.md"), { wrapper: wrap() });
    act(() => result.current.report({ scrollX: 7, scrollY: 8, zoom: { value: 1 } }));
    unmount();
    expect(JSON.parse(sessionStorage.getItem("hermes_board_viewport")!)["b.board.md"]).toEqual({ scrollX: 7, scrollY: 8, zoom: 1 });
  });
});
