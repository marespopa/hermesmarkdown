import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import TabStripScroller from "./TabStripScroller";

const setWidths = (scrollWidth: number, clientWidth: number) => {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => scrollWidth });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => clientWidth });
};

describe("TabStripScroller", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    // Restore jsdom's own (Element.prototype) getters.
    delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  });

  it("hides the arrows when the tabs fit", () => {
    setWidths(200, 200);
    render(<TabStripScroller data-testid="strip"><span>Tab</span></TabStripScroller>);
    expect(screen.queryByLabelText("Scroll tabs left")).toBeNull();
    expect(screen.queryByLabelText("Scroll tabs right")).toBeNull();
  });

  it("shows the arrows when the tabs overflow, with left disabled at the start", () => {
    setWidths(800, 200);
    render(<TabStripScroller data-testid="strip"><span>Tab</span></TabStripScroller>);
    expect(screen.getByLabelText("Scroll tabs left")).toBeDisabled();
    expect(screen.getByLabelText("Scroll tabs right")).not.toBeDisabled();
  });

  it("scrolls the strip when an arrow is clicked", () => {
    setWidths(800, 200);
    render(<TabStripScroller data-testid="strip"><span>Tab</span></TabStripScroller>);
    const strip = screen.getByTestId("strip");
    const scrollBy = vi.fn();
    strip.scrollBy = scrollBy as unknown as typeof strip.scrollBy;
    fireEvent.click(screen.getByLabelText("Scroll tabs right"));
    expect(scrollBy).toHaveBeenCalledWith({ left: 140, behavior: "smooth" });
  });

  it("enables the left arrow after scrolling", () => {
    setWidths(800, 200);
    render(<TabStripScroller data-testid="strip"><span>Tab</span></TabStripScroller>);
    const strip = screen.getByTestId("strip");
    strip.scrollLeft = 300;
    fireEvent.scroll(strip);
    expect(screen.getByLabelText("Scroll tabs left")).not.toBeDisabled();
    expect(screen.getByLabelText("Scroll tabs right")).not.toBeDisabled();
  });
});
