import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DemoFiles, { PINS, TREE } from "./DemoFiles";
import DemoFocus from "./DemoFocus";
import DemoPalette from "./DemoPalette";
import DemoRender from "./DemoRender";
import DemoTable from "./DemoTable";

describe("landing demos", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("table: the finished frame has the typed rows", () => {
    render(<DemoTable />);
    const demo = screen.getByRole("img", { name: /table being edited/ });
    expect(demo).toHaveTextContent("Dark theme");
    expect(demo).toHaveTextContent("Release notes");
    expect(demo.querySelectorAll("tr")).toHaveLength(4);
  });

  it("table: starts from the first rows and adds one with Tab", () => {
    render(<DemoTable />);
    const demo = screen.getByRole("img", { name: /table being edited/ });
    act(() => { vi.advanceTimersByTime(1300); });
    expect(demo.querySelectorAll("tr")).toHaveLength(2);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(demo.querySelectorAll("tr")).toHaveLength(3);
  });

  it("palette: the finished frame shows the one matching command, selected", () => {
    render(<DemoPalette />);
    const demo = screen.getByRole("img", { name: /command palette/ });
    expect(demo).toHaveTextContent("Export as PDF");
    expect(demo.querySelectorAll("li")).toHaveLength(1);
    expect(demo.querySelector("[data-selected]")).toHaveTextContent("Export as PDF");
  });

  it("palette: starts closed on the note, then opens on a list of notes and commands", () => {
    render(<DemoPalette />);
    const demo = screen.getByRole("img", { name: /command palette/ });
    act(() => { vi.advanceTimersByTime(1300); });
    expect(demo.querySelectorAll("li")).toHaveLength(0);
    act(() => { vi.advanceTimersByTime(1200); });
    expect(demo).toHaveTextContent("Search files or type a command...");
    expect(demo.querySelectorAll("li").length).toBeGreaterThan(1);
  });

  it("render: the finished frame shows the drawn diagram, not its code", () => {
    render(<DemoRender />);
    const demo = screen.getByRole("img", { name: /drawn diagram/ });
    expect(screen.getByTestId("demo-diagram")).toBeInTheDocument();
    expect(demo.textContent).not.toContain("mermaid");
    expect(demo).toHaveTextContent("Review");
  });

  it("render: shows the typed code before the diagram", () => {
    render(<DemoRender />);
    act(() => { vi.advanceTimersByTime(1300); });
    expect(screen.queryByTestId("demo-diagram")).toBeNull();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByRole("img").textContent).toContain("```mermaid");
  });

  it("focus: the finished frame holds both paragraphs and the typed sentences", () => {
    render(<DemoFocus />);
    const demo = screen.getByRole("img", { name: /Focus mode/ });
    expect(demo).toHaveTextContent("The release is planned for Friday.");
    expect(demo).toHaveTextContent("Next we tag the build. Then we announce it.");
    expect(demo.querySelectorAll("p")).toHaveLength(2);
  });

  it("files: the editor's sidebar with emoji pins and a mixed folder, the note open beside it", () => {
    render(<DemoFiles />);
    const demo = screen.getByRole("img", { name: /folder of notes, code and images/ });
    expect(demo.querySelectorAll("[data-pin]")).toHaveLength(PINS.length);
    for (const pin of PINS) expect(demo).toHaveTextContent(`${pin.icon}${pin.label}`);
    for (const file of TREE) expect(demo).toHaveTextContent(file.name);
    // The note is drawn as the editor draws it: no marks off the caret's line.
    expect(demo).toHaveTextContent("Release plan");
    expect(demo).not.toHaveTextContent("](Roadmap.md)");
  });
});
