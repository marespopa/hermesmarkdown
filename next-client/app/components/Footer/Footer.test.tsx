import React from "react";
import { render } from "@testing-library/react";
import Footer from "./Footer.component";

describe("Footer", () => {
  it("links to the tools hub and every tool", () => {
    const { getByRole } = render(<Footer />);
    expect(getByRole("link", { name: "Free Tools" })).toHaveAttribute("href", "/tools");
    expect(getByRole("link", { name: "AI Tokenizer" })).toHaveAttribute("href", "/tools/tokenizer");
  });

  it("should render the component", () => {
    const { getByTestId } = render(<Footer />);
    expect(getByTestId("GlobalFooter")).toBeInTheDocument();
  });
});
