import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LandingLoop from "./LandingLoop";

const FINISHED = "Trip notes- Book the train- Read the city guide- Pack light";
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe("LandingLoop", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Types on, a key at a time, until the text matches.
  function typeUntil(box: HTMLElement, test: (text: string) => boolean) {
    for (let i = 0; i < 400 && !test(box.textContent ?? ""); i++) advance(20);
    expect(test(box.textContent ?? "")).toBe(true);
  }

  it("starts as a still of the finished note, with no marks", () => {
    render(<LandingLoop />);
    expect(screen.getByRole("img", { name: /note being typed/ })).toHaveTextContent(FINISHED, { normalizeWhitespace: false });
  });

  it("types the note, showing marks only on the caret's line", () => {
    render(<LandingLoop />);
    const box = screen.getByRole("img");

    advance(1200);
    expect(box.textContent).toBe("");
    advance(80 * 6);
    expect(box.textContent).toBe("# Trip");

    typeUntil(box, (text) => text.includes("- Book"));
    expect(box.textContent).toBe("Trip notes- Book");

    typeUntil(box, (text) => text.includes("[city guide](guide.md)"));
    typeUntil(box, (text) => text.includes("Pack"));
    expect(box.textContent).toBe("Trip notes- Book the train- Read the city guide- Pack");
  });

  it("starts again after resting on the finished note", () => {
    render(<LandingLoop />);
    const box = screen.getByRole("img");

    advance(1200);
    typeUntil(box, (text) => text === FINISHED);
    advance(3000);
    expect(box.textContent).toBe("");
  });

  it("stays still when motion is reduced", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({ matches: true, media: query }) as MediaQueryList);
    render(<LandingLoop />);

    advance(10000);
    expect(screen.getByRole("img")).toHaveTextContent(FINISHED, { normalizeWhitespace: false });
  });
});
