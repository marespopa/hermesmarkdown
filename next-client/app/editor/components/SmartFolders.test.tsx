import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SmartFolders from "./SmartFolders";
import "@testing-library/jest-dom";

// Mock jotai's useAtom
vi.mock("jotai", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAtom: vi.fn(),
  };
});

import { useAtom } from "jotai";

describe("SmartFolders Component", () => {
  const mockOnFileSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  const mockMetadata = {
    "file1.md": {
      path: "file1.md",
      name: "file1.md",
      tags: ["#todo"],
      frontmatter: {},
      modifiedAt: Date.now(),
      wordCount: 10,
      handle: { name: "file1.md", kind: "file" } as any,
    },
  };

  it("renders default workspace names", () => {
    (useAtom as any).mockReturnValue([{}, vi.fn()]);
    
    render(<SmartFolders onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText("Today's Work")).toBeInTheDocument();
    expect(screen.getByText("Review Pending")).toBeInTheDocument();
    expect(screen.getByText("Stale Logs")).toBeInTheDocument();
  });

  it("expands a folder and shows matching files", () => {
    (useAtom as any).mockReturnValue([mockMetadata, vi.fn()]);

    render(<SmartFolders onFileSelect={mockOnFileSelect} />);

    // Click on "Review Pending" (which matches #todo)
    const folder = screen.getByText("Review Pending");
    fireEvent.click(folder);

    expect(screen.getByText("file1.md")).toBeInTheDocument();
  });

  it("calls onFileSelect when a file is clicked", () => {
    (useAtom as any).mockReturnValue([mockMetadata, vi.fn()]);

    render(<SmartFolders onFileSelect={mockOnFileSelect} />);

    fireEvent.click(screen.getByText("Review Pending"));
    fireEvent.click(screen.getByText("file1.md"));

    expect(mockOnFileSelect).toHaveBeenCalledWith(
      mockMetadata["file1.md"].handle,
      mockMetadata["file1.md"].path,
    );
  });
});
