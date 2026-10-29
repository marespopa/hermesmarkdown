import React from "react";
import { render } from "@testing-library/react";
import Footer from "./Footer.component";

describe("Footer", () => {
  it("should render the component", () => {
    const { getByTestId } = render(<Footer />);
    expect(getByTestId("GlobalFooter")).toBeInTheDocument();
  });
});
