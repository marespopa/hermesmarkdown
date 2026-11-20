import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Reveal from "./Reveal";

let intersect: ((on: boolean) => void) | undefined;
class FakeObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersect = (on) => callback([{ isIntersecting: on } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  observe() {}
  disconnect() {}
}

function below() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: window.innerHeight + 100 } as DOMRect);
}

const shown = () => screen.getByText("Chapter").parentElement?.getAttribute("data-reveal");

describe("Reveal", () => {
  afterEach(() => {
    intersect = undefined;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("waits below the fold and enters once it scrolls into view", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    below();
    render(<Reveal><p>Chapter</p></Reveal>);

    expect(shown()).toBe("waiting");
    act(() => intersect?.(true));
    expect(shown()).toBe("shown");
  });

  it("stays shown under reduced motion", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce") }) as MediaQueryList);
    below();
    render(<Reveal><p>Chapter</p></Reveal>);

    expect(shown()).toBe("shown");
  });

  it("never hides what is already on screen", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    render(<Reveal><p>Chapter</p></Reveal>);

    expect(shown()).toBe("shown");
  });
});
