import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atom_showOutline } from "@/app/atoms/ui-atoms";
import EditorOutline from "./EditorOutline";

// A fake editor: every line 20px tall, the document at the pane's top, which
// moves up as the pane scrolls (documentTop is relative to the viewport).
function fakeView(text: string, scroller: HTMLElement) {
  const lines = text.split("\n");
  const starts = lines.map((_, i) => lines.slice(0, i).reduce((sum, line) => sum + line.length + 1, 0));
  const lineOf = (pos: number) => starts.filter((start) => start <= pos).length;
  const lineElement = Object.assign(document.createElement("div"), { className: "cm-line", animate: vi.fn() });
  return {
    lineElement,
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
    domAtPos: () => ({ node: lineElement }),
    dispatch: vi.fn(),
    focus: vi.fn(),
  };
}

function setup(text: string, props: { isCode?: boolean; filePath?: string } = {}) {
  const scroller = document.createElement("div");
  Object.defineProperty(scroller, "clientHeight", { value: 400, configurable: true });
  let scrollTop = 0;
  Object.defineProperty(scroller, "scrollTop", { get: () => scrollTop, set: (value: number) => { scrollTop = Math.max(0, value); }, configurable: true });
  scroller.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  document.body.append(scroller);
  const view = fakeView(text, scroller);
  const store = createStore();
  store.set(atom_showOutline, true);
  render(
    <Provider store={store}>
      <EditorOutline view={view as never} scrollerRef={{ current: scroller }} text={text} {...props} />
    </Provider>,
  );
  return { scroller, view, store };
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

  it("jumps to a heading: caret on it, scrolled to where it's read, editor focused, its line flashed", () => {
    const { scroller, view } = setup(NOTE);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    // Line 12 starts at 220px; less a quarter of the pane.
    expect(scroller.scrollTop).toBe(120);
    expect(view.dispatch).toHaveBeenCalledWith({ selection: { anchor: NOTE.split("\n").slice(0, 11).join("\n").length + 1 } });
    expect(view.focus).toHaveBeenCalled();
    expect(view.lineElement.animate).toHaveBeenCalledTimes(1);
  });

  it("lists symbols that share a line as their own rows, only one of them current", () => {
    vi.useFakeTimers();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setup("enum Status { Draft, Done }", { isCode: true, filePath: "Status.cs" });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    vi.useRealTimers();
    expect(screen.getAllByRole("button").filter((row) => row.textContent).map((row) => row.textContent)).toEqual(["Status", "Draft", "Done"]);
    expect(screen.getByRole("button", { name: "Done" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("button", { name: "Draft" })).not.toHaveAttribute("aria-current");
    expect(error).not.toHaveBeenCalled();
  });

  it("keeps a clicked heading current when the pane can't scroll it to the reading point, until the pane scrolls", () => {
    const { scroller } = setup(["# Plan", "## Goals", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Done"].join("\n"));
    // At the top, the reading point (line 6) is under Goals.
    expect(screen.getByRole("button", { name: "Goals" })).toHaveAttribute("aria-current", "location");

    fireEvent.click(screen.getByRole("button", { name: "Plan" }));
    expect(scroller.scrollTop).toBe(0);
    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("button", { name: "Plan" })).toHaveAttribute("aria-current", "location");

    act(() => {
      scroller.scrollTop = 40;
      scroller.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getByRole("button", { name: "Goals" })).toHaveAttribute("aria-current", "location");
  });

  it("renders nothing for a note without headings", () => {
    setup("Just text\nand more");
    expect(screen.queryByRole("navigation", { name: "Outline" })).not.toBeInTheDocument();
  });

  it("turns the outline off from its ×", () => {
    const { store } = setup(NOTE);
    fireEvent.click(screen.getByRole("button", { name: "Close outline" }));
    expect(store.get(atom_showOutline)).toBe(false);
  });
});
