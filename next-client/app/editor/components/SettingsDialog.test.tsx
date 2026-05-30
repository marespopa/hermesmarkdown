import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsDialog from "./SettingsDialog";
import "@testing-library/jest-dom";

// Mock jotai's useAtom and createStore
vi.mock("jotai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAtom: vi.fn(),
  };
});

import { useAtom } from "jotai";

describe("SettingsDialog Component", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    // Default mock implementation for useAtom
    (useAtom as any).mockImplementation(() => {
      return ["16px", vi.fn()]; 
    });
  });

  it("renders settings options", () => {
    render(<SettingsDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Typeface")).toBeInTheDocument();
    expect(screen.getByText("Text Size")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    render(<SettingsDialog isOpen={true} onClose={mockOnClose} />);

    // The close button is the aria-label="Close modal" one in DialogModal
    const closeButton = screen.getByLabelText("Close modal");
    
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
