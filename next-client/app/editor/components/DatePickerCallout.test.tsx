import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DatePickerCallout from "./DatePickerCallout";
import React from "react";

describe("DatePickerCallout", () => {
  const mockOnSelectDate = vi.fn();
  const mockOnClose = vi.fn();
  const initialDate = new Date(2026, 5, 4); // June 4, 2026

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderOpen = () =>
    render(
      <DatePickerCallout
        isOpen={true}
        initialDate={initialDate}
        onSelectDate={mockOnSelectDate}
        onClose={mockOnClose}
      />,
    );

  it("renders the correct month and year when open", () => {
    renderOpen();
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(
      <DatePickerCallout
        isOpen={false}
        initialDate={initialDate}
        onSelectDate={mockOnSelectDate}
        onClose={mockOnClose}
      />,
    );
    expect(screen.queryByText("June 2026")).not.toBeInTheDocument();
  });

  it("calls onSelectDate when a day is clicked", () => {
    renderOpen();
    fireEvent.click(screen.getByText("15"));
    expect(mockOnSelectDate).toHaveBeenCalled();
    const called = mockOnSelectDate.mock.calls[0][0] as Date;
    expect(called.getFullYear()).toBe(2026);
    expect(called.getMonth()).toBe(5);
    expect(called.getDate()).toBe(15);
  });

  it("navigates to next month", () => {
    renderOpen();
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByText("July 2026")).toBeInTheDocument();
  });

  it("navigates to previous month", () => {
    renderOpen();
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(screen.getByText("May 2026")).toBeInTheDocument();
  });

  it("calls onSelectDate for 'Today' quick action", () => {
    renderOpen();
    fireEvent.click(screen.getByText("Today"));
    expect(mockOnSelectDate).toHaveBeenCalled();
    const called = mockOnSelectDate.mock.calls[0][0] as Date;
    expect(called.toDateString()).toBe(new Date().toDateString());
  });

  it("calls onClose when the dialog close button is clicked", () => {
    renderOpen();
    fireEvent.click(screen.getByLabelText("Close calendar"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("navigates but does not select for '+1 Month' quick action", () => {
    renderOpen(); // June 2026
    fireEvent.click(screen.getByText("+1 Month"));
    expect(screen.getByText("July 2026")).toBeInTheDocument();
    expect(mockOnSelectDate).not.toHaveBeenCalled();
  });

  it("navigates but does not select for '+1 Week' quick action", () => {
    renderOpen(); // June 4, 2026 (Thursday)
    fireEvent.click(screen.getByText("+1 Week"));
    // Focused date should be June 11, 2026. View is still June 2026.
    expect(screen.getByText("June 2026")).toBeInTheDocument();
    expect(mockOnSelectDate).not.toHaveBeenCalled();
    
    // Pressing Enter should select the focused date (June 11)
    const container = screen.getByText("June 2026").closest('[tabindex="0"]');
    fireEvent.keyDown(container!, { key: "Enter" });
    expect(mockOnSelectDate).toHaveBeenCalled();
    const called = mockOnSelectDate.mock.calls[0][0] as Date;
    expect(called.getDate()).toBe(11);
    expect(called.getMonth()).toBe(5); // June
  });
});
