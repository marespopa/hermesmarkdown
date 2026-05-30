import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DialogModal from "./DialogModal";
import "@testing-library/jest-dom";

describe("DialogModal Component", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders children when isOpened is true", () => {
    render(
      <DialogModal isOpened={true} onClose={mockOnClose}>
        <div data-testid="modal-content">Modal Content</div>
      </DialogModal>
    );
    expect(screen.getByTestId("modal-content")).toBeInTheDocument();
  });

  it("does not render when isOpened is false", () => {
    render(
      <DialogModal isOpened={false} onClose={mockOnClose}>
        <div data-testid="modal-content">Modal Content</div>
      </DialogModal>
    );
    expect(screen.queryByTestId("modal-content")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    render(
      <DialogModal isOpened={true} onClose={mockOnClose}>
        <div>Content</div>
      </DialogModal>
    );
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const { container } = render(
      <DialogModal isOpened={true} onClose={mockOnClose}>
        <div>Content</div>
      </DialogModal>
    );
    
    // The first div is the fixed inset container which acts as backdrop trigger
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    render(
      <DialogModal isOpened={true} onClose={mockOnClose}>
        <div>Content</div>
      </DialogModal>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when Enter key is pressed", () => {
    const mockOnConfirm = vi.fn();
    render(
      <DialogModal isOpened={true} onClose={mockOnClose} onConfirm={mockOnConfirm}>
        <div>Content</div>
      </DialogModal>
    );
    fireEvent.keyDown(window, { key: "Enter" });
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not call onConfirm when Enter key is pressed and focus is on textarea", () => {
    const mockOnConfirm = vi.fn();
    render(
      <DialogModal isOpened={true} onClose={mockOnClose} onConfirm={mockOnConfirm}>
        <textarea data-testid="test-textarea" />
      </DialogModal>
    );
    
    const textarea = screen.getByTestId("test-textarea");
    textarea.focus();
    
    fireEvent.keyDown(window, { key: "Enter" });
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
