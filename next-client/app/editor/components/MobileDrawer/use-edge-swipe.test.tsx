import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { classifySwipe, edgeOf, useEdgeSwipe } from "./use-edge-swipe";

const touch = (type: string, x: number, y: number) => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "touches", { value: [{ clientX: x, clientY: y }] });
  document.dispatchEvent(event);
};

function Harness({ onLeftEdge, onRightEdge }: { onLeftEdge: () => void; onRightEdge: () => void }) {
  useEdgeSwipe({ enabled: true, onLeftEdge, onRightEdge });
  return <input aria-label="field" />;
}

describe("swipe geometry", () => {
  it("finds the edge a touch starts in", () => {
    expect(edgeOf(5, 400)).toBe("left");
    expect(edgeOf(395, 400)).toBe("right");
    expect(edgeOf(200, 400)).toBeNull();
  });

  it("needs 60px, mostly sideways", () => {
    expect(classifySwipe(59, 0)).toBeNull();
    expect(classifySwipe(60, 0)).toBe("right");
    expect(classifySwipe(-80, 10)).toBe("left");
    expect(classifySwipe(70, 90)).toBeNull();
  });
});

describe("useEdgeSwipe", () => {
  afterEach(() => (document.activeElement as HTMLElement | null)?.blur());

  it("opens the left drawer on a right swipe from the left edge, once", () => {
    const left = vi.fn();
    const right = vi.fn();
    Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
    render(<Harness onLeftEdge={left} onRightEdge={right} />);
    touch("touchstart", 4, 300);
    touch("touchmove", 40, 302);
    expect(left).not.toHaveBeenCalled();
    touch("touchmove", 80, 305);
    touch("touchmove", 120, 305);
    expect(left).toHaveBeenCalledTimes(1);
    expect(right).not.toHaveBeenCalled();
  });

  it("opens the right drawer on a left swipe from the right edge", () => {
    const right = vi.fn();
    Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
    render(<Harness onLeftEdge={vi.fn()} onRightEdge={right} />);
    touch("touchstart", 397, 300);
    touch("touchmove", 320, 300);
    expect(right).toHaveBeenCalledTimes(1);
  });

  it("ignores a swipe that starts away from the edge or while a field has focus", () => {
    const left = vi.fn();
    Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
    const { getByLabelText } = render(<Harness onLeftEdge={left} onRightEdge={vi.fn()} />);
    touch("touchstart", 100, 300);
    touch("touchmove", 200, 300);
    fireEvent.focus(getByLabelText("field"));
    getByLabelText("field").focus();
    touch("touchstart", 4, 300);
    touch("touchmove", 120, 300);
    expect(left).not.toHaveBeenCalled();
  });
});
