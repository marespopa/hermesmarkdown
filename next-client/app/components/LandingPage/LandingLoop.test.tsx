import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LandingLoop from "./LandingLoop";

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe("LandingLoop", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const box = () => screen.getByRole("img", { name: /note being typed/ });
  function typeUntil(test: (text: string) => boolean) {
    for (let i = 0; i < 1000 && !test(box().textContent ?? ""); i++) advance(20);
    expect(test(box().textContent ?? "")).toBe(true);
  }

  it("starts as a still of the finished note, with its first task ticked", () => {
    render(<LandingLoop />);
    expect(box()).toHaveTextContent("Launch checklist");
    expect(box()).toHaveTextContent("Write the release notes");
    expect(box().textContent).not.toContain("**");
    expect(box().querySelector("[data-task='done']")).not.toBeNull();
    // The link is folded to its label, and no line shows its heading marks.
    expect(box().querySelector("[data-link]")).toHaveTextContent("changelog");
    expect(box().textContent).not.toContain("](log.md)");
    expect(box().querySelector("[data-margin-marks='shown']")).toBeNull();
  });

  it("shows marks only on the caret's line while typing", () => {
    render(<LandingLoop />);
    advance(1200);
    expect(box().textContent).toBe("");

    typeUntil((text) => text.includes("Launch"));
    // The heading's `#` shows in the margin while its line is being typed.
    expect(box().querySelector("[data-margin-marks='shown']")).not.toBeNull();

    typeUntil((text) => text.includes("Write the **release"));
    expect(box().textContent).toContain("- [ ] Write the **release");
    expect(box().querySelector("[data-margin-marks='shown']")).toBeNull();

    typeUntil((text) => text.includes("[changelog](log.md)"));
    // The caret left the bold line: its marks are gone, and the new line shows its own.
    expect(box().textContent).not.toContain("**");
    expect(box().textContent).toContain("[changelog](log.md)");

    typeUntil((text) => text.includes("Tag"));
    expect(box().textContent).not.toContain("](log.md)");
    expect(box().querySelector("[data-link]")).toHaveTextContent("changelog");
    // List markers stay as typed on every line.
    expect(box().textContent).toContain("- [ ] Update the changelog");
    expect(box().querySelectorAll("[data-caret]")).toHaveLength(1);
  });

  it("ticks a task, rests, then starts again", () => {
    render(<LandingLoop />);
    advance(1200);
    typeUntil((text) => text.includes("Tag the build"));
    expect(box().querySelector("[data-task='done']")).toBeNull();
    typeUntil(() => box().querySelector("[data-task='done']") !== null);
    advance(3500);
    expect(box().textContent).toBe("");
  });

  it("stays still when motion is reduced", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({ matches: true, media: query }) as MediaQueryList);
    render(<LandingLoop />);
    advance(10000);
    expect(box()).toHaveTextContent("Tag the build");
  });
});
