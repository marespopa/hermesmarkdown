import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Checkbox from "./Checkbox";
import "@testing-library/jest-dom";

describe("Checkbox Component", () => {
  const mockHandleChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders with label and checked state", () => {
    render(
      <Checkbox
        name="test-checkbox"
        label="Accept Terms"
        checked={true}
        handleChange={mockHandleChange}
      />
    );
    const checkbox = screen.getByLabelText("Accept Terms");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it("calls handleChange when clicked", () => {
    render(
      <Checkbox
        name="test-checkbox"
        label="Accept Terms"
        checked={false}
        handleChange={mockHandleChange}
      />
    );
    const checkbox = screen.getByLabelText("Accept Terms");
    fireEvent.click(checkbox);
    expect(mockHandleChange).toHaveBeenCalled();
  });

  it("renders helper text", () => {
    render(
      <Checkbox
        name="test-checkbox"
        label="Accept Terms"
        checked={false}
        helperText="Required"
        handleChange={mockHandleChange}
      />
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });
});
