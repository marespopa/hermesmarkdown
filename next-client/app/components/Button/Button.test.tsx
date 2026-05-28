import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Button from "./Button.component";
import "@testing-library/jest-dom";

describe("Button Component", () => {
  it("renders with children", () => {
    render(<Button variant="primary">Click Me</Button>);
    expect(screen.getByText("Click Me")).toBeInTheDocument();
  });

  it("renders with label prop", () => {
    render(<Button variant="primary" label="Label Button" />);
    expect(screen.getByText("Label Button")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<Button variant="primary" onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByText("Click Me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when isDisabled prop is true", () => {
    render(<Button variant="primary" isDisabled={true}>Disabled</Button>);
    expect(screen.getByText("Disabled")).toBeDisabled();
  });

  it("does not call onClick when disabled", () => {
    const handleClick = vi.fn();
    render(<Button variant="primary" isDisabled={true} onClick={handleClick}>Disabled</Button>);
    
    fireEvent.click(screen.getByText("Disabled"));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
