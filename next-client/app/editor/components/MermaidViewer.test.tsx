import { render, screen } from "@testing-library/react";
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
});
