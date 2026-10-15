import React, { useRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import FloatingStartButton from "./FloatingStartButton";

let heroBottom = 400;
// Animation frames run later, as in a browser, never inside the call that
// asks for one: scrollTo() runs the queued ones.
let frames: FrameRequestCallback[] = [];

function Harness({ onStart }: { onStart: () => void }) {
  const heroRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={heroRef} data-testid="hero" />
      <FloatingStartButton heroRef={heroRef} onStart={onStart} />
    </>
  );
}

function scrollTo(bottom: number) {
  heroBottom = bottom;
  act(() => {
    fireEvent.scroll(window);
    const queued = frames;
    frames = [];
    queued.forEach((callback) => callback(0));
  });
}

describe("FloatingStartButton", () => {
  beforeEach(() => {
    heroBottom = 400;
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ bottom: heroBottom }) as DOMRect,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is hidden and out of reach while the hero's button is on screen", () => {
    render(<Harness onStart={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Start Writing" })).not.toBeInTheDocument();
  });

  it("slides in once the hero's button scrolls away above, and out on the way back", () => {
    const onStart = vi.fn();
    render(<Harness onStart={onStart} />);

    scrollTo(-20);
    fireEvent.click(screen.getByRole("button", { name: "Start Writing" }));
    expect(onStart).toHaveBeenCalledTimes(1);

    scrollTo(120);
    expect(screen.queryByRole("button", { name: "Start Writing" })).not.toBeInTheDocument();
  });
});
