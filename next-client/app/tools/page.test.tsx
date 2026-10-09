import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ToolsPage from "./page";

describe("Tools hub", () => {
  it("links to every tool", () => {
    render(<ToolsPage />);
    expect(screen.getByRole("link", { name: /AI Tokenizer/ })).toHaveAttribute("href", "/tools/tokenizer");
  });
});
