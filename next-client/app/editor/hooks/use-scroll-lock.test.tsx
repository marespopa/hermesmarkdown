import { render, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { EditorView } from "@codemirror/view";
import { useScrollLock } from "./use-scroll-lock";

type Paths = [string | undefined, string | undefined];

function Harness({ enabled, paths, canvasB = true }: { enabled: boolean; paths: Paths; canvasB?: boolean }) {
  const a = React.useRef<HTMLDivElement>(null);
  const b = React.useRef<HTMLDivElement>(null);
  useScrollLock(a, b, { enabled, paths, activeIndex: 0 });
  return (
    <>
      <div ref={a} data-testid="a"><div className="editor-canvas" data-testid="canvas-a" /></div>
      <div ref={b} data-testid="b">{canvasB && <div className="editor-canvas" data-testid="canvas-b" />}</div>
    </>
  );
}

// jsdom doesn't lay out: give an element scroll metrics and a scrollTop that
// records writes (clamped like a browser would).
function stubScroller(el: HTMLElement, scrollHeight: number, clientHeight: number) {
  let top = 0;
  const writes: number[] = [];
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (v: number) => {
      writes.push(v);
      top = Math.max(0, Math.min(v, scrollHeight - clientHeight));
    },
  });
  return {
    writes,
    scrollTo(v: number) {
      top = v;
      fireEvent.scroll(el);
    },
  };
}

describe("useScrollLock", () => {
  beforeEach(() => {
    cleanup();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  function setup(props: { enabled: boolean; paths?: Paths; canvasB?: boolean }) {
    const view = render(<Harness paths={["a.md", "b.md"]} {...props} />);
    const canvasA = view.getByTestId("canvas-a");
    const canvasB = view.queryByTestId("canvas-b");
    const a = stubScroller(canvasA, 2000, 1000);
    const b = canvasB ? stubScroller(canvasB, 4000, 1000) : null;
    return { a, b, view };
  }

  it("sets the other pane's scroll by ratio for different notes", () => {
    const { a, b } = setup({ enabled: true });
    a.scrollTo(500);
    expect(b?.writes).toEqual([1500]);
  });

  it("does not echo the lock's own scroll back", () => {
    const { a, b } = setup({ enabled: true });
    a.scrollTo(500);
    const writesToA = a.writes.length;
    b?.scrollTo(1500); // the echo of the write above
    expect(a.writes).toHaveLength(writesToA);
  });

  it("does nothing when disabled", () => {
    const { a, b } = setup({ enabled: false });
    a.scrollTo(500);
    expect(b?.writes).toEqual([]);
  });

  it("does nothing when a side has no scroller", () => {
    const { a } = setup({ enabled: true, canvasB: false });
    expect(() => a.scrollTo(500)).not.toThrow();
  });

  it("ignores scrolls that aren't a text pane's scroller", () => {
    const { b, view } = setup({ enabled: true });
    fireEvent.scroll(view.getByTestId("a"));
    expect(b?.writes).toEqual([]);
  });

  it("aligns by document line when both panes show the same note", () => {
    const findFromDOM = vi.spyOn(EditorView, "findFromDOM").mockImplementation(
      () =>
        ({
          documentTop: 0,
          lineBlockAtHeight: () => ({ from: 3, top: 100, height: 50 }),
          lineBlockAt: () => ({ from: 3, top: 300, height: 50 }),
        }) as unknown as EditorView,
    );
    const view = render(<Harness enabled paths={["n.md", "n.md"]} />);
    const canvasA = view.getByTestId("canvas-a");
    const canvasB = view.getByTestId("canvas-b");
    canvasA.appendChild(Object.assign(document.createElement("div"), { className: "cm-editor" }));
    canvasB.appendChild(Object.assign(document.createElement("div"), { className: "cm-editor" }));
    const a = stubScroller(canvasA, 2000, 1000);
    const b = stubScroller(canvasB, 4000, 1000);
    a.scrollTo(80);
    // srcTop 48 → doc y 48 → frac clamps to 0 → target y 300 → 0 + 300 - 48.
    expect(b.writes).toEqual([252]);
    expect(findFromDOM).toHaveBeenCalled();
  });

  it("aligns once when enabled", () => {
    const view = render(<Harness enabled={false} paths={["a.md", "b.md"]} />);
    const a = stubScroller(view.getByTestId("canvas-a"), 2000, 1000);
    const b = stubScroller(view.getByTestId("canvas-b"), 4000, 1000);
    a.scrollTo(500);
    view.rerender(<Harness enabled paths={["a.md", "b.md"]} />);
    expect(b.writes).toEqual([1500]);
  });
});
