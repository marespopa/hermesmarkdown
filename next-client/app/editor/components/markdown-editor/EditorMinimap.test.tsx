import React from "react";
import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EditorMinimap, { minimapLineHeight } from "./EditorMinimap";

// jsdom has no layout, canvas or ResizeObserver: a pane 300px tall, a canvas
// that records its bars, and an observer that reports once on observe.
const bars = vi.hoisted(() => ({ rects: [] as number[][] }));

function fakeView(lines: number) {
  const doc = {
    lines,
    lineAt: (pos: number) => ({ number: Math.min(lines, Math.floor(pos / 10) + 1) }),
    line: (number: number) => ({ from: (number - 1) * 10 }),
  };
  return {
    documentTop: 0,
    state: { doc },
    // Each line 20px tall in the pane.
    lineBlockAtHeight: (y: number) => ({ from: Math.floor(y / 20) * 10 }),
    lineBlockAt: (pos: number) => ({ top: (pos / 10) * 20 }),
  } as never;
}

function setup(text: string, lines: number) {
  const scroller = document.createElement("div");
  Object.defineProperty(scroller, "clientHeight", { value: 300, configurable: true });
  let scrollTop = 0;
  Object.defineProperty(scroller, "scrollTop", { get: () => scrollTop, set: (value: number) => { scrollTop = value; }, configurable: true });
  scroller.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  document.body.append(scroller);
  const ref = { current: scroller };
  render(<EditorMinimap view={fakeView(lines)} scrollerRef={ref} text={text} />);
  return scroller;
}

describe("EditorMinimap", () => {
  beforeEach(() => {
    bars.rects = [];
    vi.stubGlobal("ResizeObserver", class {
      callback: () => void;
      constructor(callback: () => void) {
        this.callback = callback;
      }
      observe() {
        this.callback();
      }
      disconnect() {}
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      setTransform: vi.fn(), clearRect: vi.fn(), fillRect: (...rect: number[]) => bars.rects.push(rect),
      fillStyle: "", globalAlpha: 1,
    } as never);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("gives each line up to 3px, squeezing a long note to fit", () => {
    expect(minimapLineHeight(10, 300)).toBe(3);
    expect(minimapLineHeight(600, 300)).toBe(0.5);
  });

  it("draws a bar for each run of text", () => {
    setup("# Plan\n\nShip the export", 3);
    // "#", "Plan", then "Ship", "the", "export".
    expect(bars.rects).toHaveLength(5);
    expect(bars.rects[2][1]).toBe(6);
  });

  it("scrolls the pane to the line under a click, centred", () => {
    const scroller = setup("a\nb\nc", 100);
    const map = screen.getByRole("scrollbar", { name: "Minimap" });
    map.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    map.setPointerCapture = vi.fn();
    // y 30 on the map, 3px a line: line 11, 200px down; centred in 300px.
    // jsdom has no PointerEvent, so fireEvent drops clientY: define it.
    const down = createEvent.pointerDown(map, { pointerId: 1 });
    Object.defineProperty(down, "clientY", { value: 30 });
    act(() => {
      fireEvent(map, down);
    });
    expect(scroller.scrollTop).toBe(50);
  });
});
