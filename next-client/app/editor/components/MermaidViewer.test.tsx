import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MermaidViewer, { getDiagramSize } from "./MermaidViewer";

const SVG = '<svg viewBox="0 0 200 100"><g /></svg>';

describe("MermaidViewer", () => {
  it("reads the diagram's size from its viewBox", () => {
    expect(getDiagramSize(SVG)).toEqual({ width: 200, height: 100 });
    expect(getDiagramSize("<svg></svg>")).toBeNull();
  });

  it("shows the empty hint, then the diagram with its controls", () => {
    const { rerender } = render(<MermaidViewer svg={null} emptyText="Type a diagram to see it here." />);
    expect(screen.getByText("Type a diagram to see it here.")).toBeInTheDocument();
    rerender(<MermaidViewer svg={SVG} />);
    expect(screen.getByRole("button", { name: "Download diagram" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fit entire diagram" })).toBeInTheDocument();
  });

  it("keeps the last diagram, dimmed, under an error", () => {
    const { container } = render(<MermaidViewer svg={SVG} error="Parse error on line 2" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Parse error on line 2");
    expect(container.querySelector("svg")?.parentElement).toHaveClass("opacity-40");
  });

  it("zooms with the keyboard and toggles full screen", () => {
    const { container } = render(<MermaidViewer svg={SVG} />);
    const frame = container.querySelector("[tabindex='0']") as HTMLElement;
    const diagram = container.querySelector("svg")?.parentElement as HTMLElement;
    fireEvent.keyDown(frame, { key: "1" });
    expect(diagram.style.width).toBe("200px");
    fireEvent.keyDown(frame, { key: "+" });
    expect(diagram.style.width).toBe("250px");
    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
    expect(screen.getByRole("button", { name: "Exit full screen" })).toBeInTheDocument();
  });

  it("zooms with Ctrl+wheel but scrolls on a plain wheel", () => {
    const { container } = render(<MermaidViewer svg={SVG} />);
    const frame = container.querySelector("[tabindex='0']") as HTMLElement;
    const diagram = container.querySelector("svg")?.parentElement as HTMLElement;
    fireEvent.keyDown(frame, { key: "1" });
    fireEvent.wheel(frame, { deltaY: 100 });
    expect(diagram.style.width).toBe("200px");
    fireEvent.wheel(frame, { deltaY: -100, ctrlKey: true });
    expect(parseFloat(diagram.style.width)).toBeGreaterThan(200);
  });
});
