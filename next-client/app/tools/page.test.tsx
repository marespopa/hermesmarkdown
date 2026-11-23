import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ToolsPage from "./page";

describe("Tools hub", () => {
  it("links to every tool", () => {
    render(<ToolsPage />);
    expect(screen.getByRole("link", { name: /AI Tokenizer/ })).toHaveAttribute("href", "/tools/tokenizer");
    expect(screen.getByRole("link", { name: /Markdown Cleaner/ })).toHaveAttribute("href", "/tools/markdown-cleaner");
    expect(screen.getByRole("link", { name: /Word to Markdown/ })).toHaveAttribute("href", "/tools/word-to-markdown");
    expect(screen.getByRole("link", { name: /Markdown to PDF/ })).toHaveAttribute("href", "/tools/markdown-to-pdf");
  });
});
