import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appliedSteps, buildFrames, typedText, useScriptLoop, type ScriptStep } from "./useScriptLoop";

const STEPS: readonly ScriptStep[] = [{ type: "ab" }, { key: "Tab" }, { type: "c" }, { pause: 1000 }];
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

function Probe() {
  const { ref, state } = useScriptLoop(STEPS);
  return <div ref={ref} data-testid="probe">{`${state.step}:${typedText(STEPS, state)}`}</div>;
}

let observe: ((on: boolean) => void) | undefined;
class FakeObserver {
  constructor(callback: IntersectionObserverCallback) {
    observe = (on) => callback([{ isIntersecting: on } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  observe() {}
  disconnect() {}
}

describe("useScriptLoop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    observe = undefined;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("builds frames and replays steps", () => {
    const frames = buildFrames(STEPS);
    expect(frames.map((f) => f.typed)).toEqual(["", "a", "ab", "", "c"]);
    expect(typedText(STEPS, { step: 4, typed: "" })).toBe("abc");
    expect(appliedSteps(STEPS, { step: 2, typed: "c" })).toHaveLength(3);
  });

  it("starts as a still of the finished demo", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("4:abc");
  });

  it("loops: starts empty, plays through, then starts again", () => {
    render(<Probe />);
    const box = screen.getByTestId("probe");
    advance(1200);
    expect(box).toHaveTextContent("0:");
    advance(140);
    expect(box).toHaveTextContent("0:ab");
    advance(420);
    expect(box).toHaveTextContent("2:ab");
    advance(420);
    expect(box).toHaveTextContent("2:abc");
    advance(1070);
    expect(box.textContent).toBe("0:");
  });

  it("stays still when motion is reduced", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({ matches: true, media: query }) as MediaQueryList);
    render(<Probe />);
    advance(10000);
    expect(screen.getByTestId("probe")).toHaveTextContent("4:abc");
  });

  it("waits while the tab is hidden", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    render(<Probe />);
    advance(5000);
    expect(screen.getByTestId("probe")).toHaveTextContent("4:abc");
    hidden.mockReturnValue(false);
    advance(1000);
    expect(screen.getByTestId("probe").textContent).not.toBe("4:abc");
  });

  it("pauses while off screen and resumes when seen", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    render(<Probe />);
    act(() => observe?.(false));
    advance(5000);
    expect(screen.getByTestId("probe")).toHaveTextContent("4:abc");
    act(() => observe?.(true));
    advance(1000);
    expect(screen.getByTestId("probe").textContent).not.toBe("4:abc");
  });
});
