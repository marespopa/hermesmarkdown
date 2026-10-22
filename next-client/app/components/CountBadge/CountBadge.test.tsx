import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CountBadge, { formatCount } from "./index";

describe("CountBadge", () => {
  it("formats counts with thousands separators", () => {
    expect(formatCount(1204)).toBe("1,204");
  });

  it("adds a singular or plural unit", () => {
    expect(formatCount(1, ["word", "words"])).toBe("1 word");
    expect(formatCount(2, ["word", "words"])).toBe("2 words");
  });

  it("renders the count and passes attributes through", () => {
    render(<CountBadge count={12500} unit={["word", "words"]} variant="floating" role="status" />);
    expect(screen.getByRole("status")).toHaveTextContent("12,500 words");
  });
});
