import React from "react";
import { render } from "@testing-library/react";
import Footer from "./Footer.component";

describe("Footer", () => {
  it("links to the tools hub and every tool", () => {
    const { getByRole } = render(<Footer />);
    expect(getByRole("link", { name: "Free Tools" })).toHaveAttribute("href", "/tools");
    expect(getByRole("link", { name: "AI Tokenizer" })).toHaveAttribute("href", "/tools/tokenizer");
  });

  it("links to the alternatives and guides, from their data", () => {
    const { getByRole } = render(<Footer />);
    expect(getByRole("link", { name: "All alternatives" })).toHaveAttribute("href", "/alternatives");
    expect(getByRole("link", { name: "vs Obsidian" })).toHaveAttribute("href", "/alternatives/obsidian-web-editor");
    expect(getByRole("link", { name: "All guides" })).toHaveAttribute("href", "/guides");
  });

  it("should render the component", () => {
    const { getByTestId } = render(<Footer />);
    expect(getByTestId("GlobalFooter")).toBeInTheDocument();
  });
});
