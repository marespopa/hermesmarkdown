import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom";
import { CLEANER_EXAMPLES } from "../cleaner/cleaner-examples";
import { CleanerSkeleton, MermaidSkeleton, TableSkeleton, TokenCostSkeleton, TokenizerSkeleton } from "./ToolSkeletons";

describe("ToolSkeletons", () => {
  it.each([
    ["cleaner", CleanerSkeleton],
    ["mermaid", MermaidSkeleton],
    ["table", TableSkeleton],
    ["token cost", TokenCostSkeleton],
    ["tokenizer", TokenizerSkeleton],
  ])("announces the %s tool as loading", (_name, Skeleton) => {
    render(<Skeleton />);
    expect(screen.getByRole("status", { name: "Loading tool" })).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("outlines the cleaner's examples by their labels, hidden from screen readers", () => {
    render(<CleanerSkeleton />);
    for (const example of CLEANER_EXAMPLES) {
      expect(screen.getByText(example.label).closest("[aria-hidden='true']")).not.toBeNull();
    }
  });
});
