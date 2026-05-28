import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Input from "./Input.component";
import "@testing-library/jest-dom";

describe("Input Component", () => {
  const mockHandleChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders with label and value", () => {
    render(
      <Input
        name="test-input"
        label="Test Label"
        value="Initial Value"
        handleChange={mockHandleChange}
      />
    );
    expect(screen.getByLabelText("Test Label")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Initial Value")).toBeInTheDocument();
  });

  it("calls handleChange when text is typed", () => {
    render(
      <Input
        name="test-input"
        label="Test Label"
        value=""
        handleChange={mockHandleChange}
      />
    );
    const input = screen.getByLabelText("Test Label");
    fireEvent.change(input, { target: { value: "New Value" } });
    expect(mockHandleChange).toHaveBeenCalled();
  });

  it("renders helper text", () => {
    render(
      <Input
        name="test-input"
        helperText="Helper message"
        value=""
        handleChange={mockHandleChange}
      />
    );
    expect(screen.getByText("Helper message")).toBeInTheDocument();
  });

  it("calls onClear when clear button is clicked", () => {
    const mockOnClear = vi.fn();
    render(
      <Input
        name="test-input"
        value="Some text"
        handleChange={mockHandleChange}
        onClear={mockOnClear}
      />
    );
    // The clear button has an icon, so we find it by role or if it has a specific title/label.
    // In Input.component.tsx, it's a button with no text but an icon.
    const clearButton = screen.getByRole("button");
    fireEvent.click(clearButton);
    expect(mockOnClear).toHaveBeenCalledTimes(1);
  });
});
