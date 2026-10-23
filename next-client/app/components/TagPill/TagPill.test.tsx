import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TagPill, { tagKind } from "./index";

describe("tagKind", () => {
  it("detects workflow tags", () => {
    expect(tagKind("review")).toBe("workflow");
    expect(tagKind("#Draft")).toBe("workflow");
    expect(tagKind("idea")).toBe("custom");
  });
});

describe("TagPill", () => {
  it("renders #tag by default", () => {
    render(<TagPill tag="idea" />);
    expect(screen.getByText("#idea")).toBeInTheDocument();
  });

  it("label replaces the text", () => {
    render(<TagPill tag="idea" label="custom" />);
    expect(screen.getByText("custom")).toBeInTheDocument();
    expect(screen.queryByText("#idea")).toBeNull();
  });

  it("renders trailing inside the pill", () => {
    render(<TagPill tag="idea" trailing={<button>x</button>} />);
    const pill = screen.getByText("#idea");
    expect(screen.getByRole("button").parentElement).toBe(pill);
  });

  it("passes role and aria props", () => {
    render(<TagPill tag="idea" role="note" aria-label="tag idea" />);
    expect(screen.getByRole("note", { name: "tag idea" })).toBeInTheDocument();
  });
});
