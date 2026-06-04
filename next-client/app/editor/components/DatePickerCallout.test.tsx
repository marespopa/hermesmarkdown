import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DatePickerCallout from "./DatePickerCallout";
import React from "react";

describe("DatePickerCallout", () => {
  const mockOnSelectDate = vi.fn();
  const initialDate = new Date(2026, 5, 4); // June 4, 2026

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the correct month and year", () => {
    render(
      <DatePickerCallout 
        initialDate={initialDate} 
        onSelectDate={mockOnSelectDate} 
      />
    );
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });

  it("calls onSelectDate when a day is clicked", () => {
    render(
      <DatePickerCallout 
        initialDate={initialDate} 
        onSelectDate={mockOnSelectDate} 
      />
    );
    
    // Find June 15th
    const day15 = screen.getByText("15");
    fireEvent.click(day15);
    
    expect(mockOnSelectDate).toHaveBeenCalled();
    const calledDate = mockOnSelectDate.mock.calls[0][0];
    expect(calledDate.getFullYear()).toBe(2026);
    expect(calledDate.getMonth()).toBe(5);
    expect(calledDate.getDate()).toBe(15);
  });

  it("navigates months correctly", () => {
    render(
      <DatePickerCallout 
        initialDate={initialDate} 
        onSelectDate={mockOnSelectDate} 
      />
    );
    
    const nextButton = screen.getAllByRole("button")[1]; // Right arrow
    fireEvent.click(nextButton);
    
    expect(screen.getByText("July 2026")).toBeInTheDocument();
  });

  it("calls onSelectDate for 'Today' action", () => {
    render(
      <DatePickerCallout 
        initialDate={initialDate} 
        onSelectDate={mockOnSelectDate} 
      />
    );
    
    const todayButton = screen.getByText("Today");
    fireEvent.click(todayButton);
    
    expect(mockOnSelectDate).toHaveBeenCalled();
    const calledDate = mockOnSelectDate.mock.calls[0][0];
    const today = new Date();
    expect(calledDate.toDateString()).toBe(today.toDateString());
  });
});
