import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EditorOutline from "./EditorOutline";

// A fake editor: every line 20px tall, the document at the pane's top, which
// moves up as the pane scrolls (documentTop is relative to the viewport).
function fakeView(text: string, scroller: HTMLElement) {
  const lines = text.split("\n");
  const starts = lines.map((_, i) => lines.slice(0, i).reduce((sum, line) => sum + line.length + 1, 0));
  const lineOf = (pos: number) => starts.filter((start) => start <= pos).length;
  return {
    get documentTop() {
      return -scroller.scrollTop;
    },
    state: {
      doc: {
        lines: lines.length,
        line: (number: number) => ({ from: starts[number - 1], number }),
        lineAt: (pos: number) => ({ number: lineOf(pos) }),
      },
    },
    lineBlockAtHeight: (y: number) => ({ from: starts[Math.min(lines.length - 1, Math.floor(y / 20))] }),
    lineBlockAt: (pos: number) => ({ top: (lineOf(pos) - 1) * 20 }),
    dispatch: vi.fn(),
    focus: vi.fn(),
  };
}

function setup(text: string) {
  const scroller = document.createElement("div");
  Object.defineProperty(scroller, "clientHeight", { value: 400, configurable: true });
  let scrollTop = 0;
  Object.defineProperty(scroller, "scrollTop", { get: () => scrollTop, set: (value: number) => { scrollTop = value; }, configurable: true });
  scroller.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  document.body.append(scroller);
  const view = fakeView(text, scroller);
  render(<EditorOutline view={view as never} scrollerRef={{ current: scroller }} text={text} />);
  return { scroller, view };
}

// Twenty lines: headings on lines 1, 5 and 12.
const NOTE = ["# Plan", "", "Intro", "", "## Goals", "", "", "", "", "", "", "### Export", "", "", "", "", "", "", "", "Done"].join("\n");

describe("EditorOutline", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("lists the headings as text, the section being read current", () => {
    setup(NOTE);
    const outline = screen.getByRole("navigation", { name: "Outline" });
    expect(outline).toHaveTextContent("PlanGoalsExport");
    // A quarter of 400px down: y 100, line 6, under Goals.
    expect(screen.getByRole("button", { name: "Goals" })).toHaveAttribute("aria-current", "location");
  });

  it("follows the pane's scroll", () => {
    const { scroller } = setup(NOTE);
    // y 200 + 100: line 16, under Export.
    scroller.scrollTop = 200;
    act(() => {
      fireEvent.scroll(scroller);
    });
    expect(screen.getByRole("button", { name: "Export" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("button", { name: "Goals" })).not.toHaveAttribute("aria-current");
  });

  it("jumps to a heading: caret on it, scrolled to where it's read, editor focused", () => {
    const { scroller, view } = setup(NOTE);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    // Line 12 starts at 220px; less a quarter of the pane.
    expect(scroller.scrollTop).toBe(120);
    expect(view.dispatch).toHaveBeenCalledWith({ selection: { anchor: NOTE.split("\n").slice(0, 11).join("\n").length + 1 } });
    expect(view.focus).toHaveBeenCalled();
  });

  it("renders nothing for a note without headings", () => {
    setup("Just text\nand more");
    expect(screen.queryByRole("navigation", { name: "Outline" })).not.toBeInTheDocument();
  });
});
